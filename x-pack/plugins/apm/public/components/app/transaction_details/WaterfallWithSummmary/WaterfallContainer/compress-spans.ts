import { IWaterfall, IWaterfallItem, IWaterfallSpan, getChildrenGroupedByParentId, getOrderedWaterfallItems, reparentSpans, IWaterfallTransaction, IWaterfallSpanOrTransaction } from './Waterfall/waterfall_helpers/waterfall_helpers';

import { Span } from '../../../../../../typings/es_schemas/ui/span';
import uuid from 'uuid';

export function doCompressSpans(waterfall: IWaterfall, nPlusOneThreshold: number, durationThresholdMs: number): IWaterfall {
    const itemsToProcess: IWaterfallItem[] = [];

    const transformedItems: IWaterfallItem[] = [];

    itemsToProcess.push(waterfall.entryWaterfallTransaction as IWaterfallItem);

    while (itemsToProcess.length > 0) {
        const nextItemToProcess = itemsToProcess.shift();
        if (nextItemToProcess !== undefined) {
            const children = waterfall.childrenByParentId[nextItemToProcess.id];
            if (children !== undefined) {
                transformedItems.push(nextItemToProcess);
                transformChildren(children, transformedItems, itemsToProcess,
                    waterfall.childrenByParentId, durationThresholdMs, nPlusOneThreshold);
            }
        }
    }

    return createWaterfall(waterfall, transformedItems);
}

function transformChildren(children: IWaterfallItem[], transformedItems: IWaterfallItem[], itemsToProcess: IWaterfallItem[], childrenByParentId: Record<string | number, IWaterfallItem[]>, durationThresholdMs: number, nPlusOneThreshold: number) {
    var prevItem: IWaterfallSpan | undefined = undefined;
    var state: AlgorithmState = { compressedSpan: undefined, prevCompressedSpan: undefined };
    const durationThreshold = durationThresholdMs * 1000;
    var i;
    for (i = 0; i < children.length; i++) {
        const item = children[i] as IWaterfallSpan;
        const hasSubChildren = childrenByParentId[item.id] !== undefined;
        const isSpan = item.docType === 'span';

        if (hasSubChildren || !isSpan) {
            // current item is either a parent or not a span
            itemsToProcess.push(item);
            reportCSpan(transformedItems, state, durationThreshold, nPlusOneThreshold);
        } else {
            processExitSpan(transformedItems, item, prevItem, state, durationThreshold, nPlusOneThreshold);
        }

        prevItem = item;
    }

    while (state.prevCompressedSpan || state.compressedSpan) {
        reportCSpan(transformedItems, state, durationThreshold, nPlusOneThreshold);
    }
}

function processExitSpan(transformedItems: IWaterfallItem[], item: IWaterfallSpan, prevItem: IWaterfallSpan | undefined, state: AlgorithmState, durationThreshold: number, nPlusOneThreshold: number) {
    const isShort = item.duration < durationThreshold;
    const sameDestination = state.compressedSpan && item.doc.span.type === state.compressedSpan.type
        && item.doc.span.subtype === state.compressedSpan.subtype
        && item.doc.span.destination !== undefined
        && item.doc.span.destination?.service.resource === state.compressedSpan.destination;

    const sameQueryAsPrev = prevItem && prevItem.doc.span.db && sameDestination && item.doc.span.db && item.doc.span.db?.statement === prevItem.doc.span.db?.statement;
    const sameQueryAsCompressedSpan = sameDestination && item.doc.span.db && state.compressedSpan && item.doc.span.db?.statement === state.compressedSpan.query;
    const cSpanContainsLongCall = state.compressedSpan && state.compressedSpan.maxDuration >= durationThreshold;
    const cSpanIsNPlusOneCandidate = state.compressedSpan && state.compressedSpan.query;

    if (isShort && !sameQueryAsPrev) {
        // current span is short but with different query as previous
        if (sameDestination && !cSpanContainsLongCall && !cSpanIsNPlusOneCandidate) {
            extendCSpan(state, item);
        } else {
            reportCSpan(transformedItems, state, durationThreshold, nPlusOneThreshold);
            state.compressedSpan = newCSpan(item);
        }
    } else if (sameQueryAsPrev) {
        // current span is long and has the same query as previous
        if (sameQueryAsCompressedSpan) {
            extendCSpan(state, item);
        } else {
            correctCSpan(state, item);
            reportCSpan(transformedItems, state, durationThreshold, nPlusOneThreshold);
            state.compressedSpan = newCSpan(prevItem as IWaterfallSpan);
            extendCSpan(state, item);
        }
    } else {
        // current span is long and does not have the same query as previous
        reportCSpan(transformedItems, state, durationThreshold, nPlusOneThreshold);
        state.compressedSpan = newCSpan(item);
    }
}

function newCSpan(span: IWaterfallSpan): ICompressedSpan {
    return {
        count: 1,
        destination: span.doc.span.destination ? span.doc.span.destination.service.resource : (span.doc.span.type + "/" + (span.doc.span.subtype ? span.doc.span.subtype : "")),
        parentId: span.parentId as string,
        parent: span.parent,
        duration: span.duration,
        maxDuration: span.duration,
        type: span.doc.span.type,
        query: span.doc.span.db?.statement,
        subtype: span.doc.span.subtype,
        originSpan: span,
        start: span.doc.timestamp.us,
        end: span.doc.timestamp.us + span.duration,
        prevEnd: span.doc.timestamp.us
    };
}

function extendCSpan(state: AlgorithmState, item: IWaterfallSpan) {
    if (!state.compressedSpan) {
        state.compressedSpan = newCSpan(item);
    } else {
        state.compressedSpan.duration += item.duration;
        if (item.duration > state.compressedSpan.maxDuration) {
            state.compressedSpan.maxDuration = item.duration;
        }
        state.compressedSpan.count += 1;
        state.compressedSpan.prevEnd = state.compressedSpan.end;
        state.compressedSpan.end = item.doc.timestamp.us + item.duration;
        if (state.compressedSpan.query !== item.doc.span.db?.statement) {
            state.compressedSpan.query = undefined;
        }
    }
}

function correctCSpan(state: AlgorithmState, item: IWaterfallSpan) {
    if (state.compressedSpan) {
        state.compressedSpan.duration -= item.duration;
        if (item.duration > state.compressedSpan.maxDuration) {
            state.compressedSpan.maxDuration = item.duration;
        }
        state.compressedSpan.count -= 1;
        state.compressedSpan.end = state.compressedSpan.prevEnd;
    }
}

function reportCSpan(transformedItems: IWaterfallItem[], state: AlgorithmState, durationThreshold: number, nPlusOneThreshold: number) {
    const cSpan = state.compressedSpan;
    const prevCSpan = state.prevCompressedSpan;
    var itemToReport: IWaterfallSpan | undefined = undefined;
    if (!cSpan && prevCSpan) {
        itemToReport = getSpanItem(prevCSpan, nPlusOneThreshold);
        state.prevCompressedSpan = state.compressedSpan;
    } else if (cSpan && prevCSpan) {
        const sameDestination = cSpan.destination === prevCSpan.destination;
        const sameQuery = cSpan.query && prevCSpan.query && cSpan.query === prevCSpan.query;
        const bothShort = cSpan.maxDuration < durationThreshold && prevCSpan.maxDuration < durationThreshold;
        const currentIsFullNPlusOne = cSpan.query && cSpan.count >= nPlusOneThreshold;
        const prevIsFullNPlusOne = prevCSpan.query && prevCSpan.count >= nPlusOneThreshold;
        const noneIsNPlusOne = !currentIsFullNPlusOne && !prevIsFullNPlusOne;
        if (sameDestination && ((bothShort && noneIsNPlusOne) || sameQuery)) {
            // Merge current compressed span with previous
            prevCSpan.duration += cSpan.duration;
            if (cSpan.maxDuration > prevCSpan.maxDuration) {
                prevCSpan.maxDuration = cSpan.maxDuration;
            }
            prevCSpan.count += cSpan.count;
            prevCSpan.prevEnd = cSpan.prevEnd;
            prevCSpan.end = cSpan.end;
            if (prevCSpan.query !== cSpan.query) {
                prevCSpan.query = undefined;
            }
        } else {
            itemToReport = getSpanItem(prevCSpan, nPlusOneThreshold);
            state.prevCompressedSpan = state.compressedSpan;
        }
    } else {
        state.prevCompressedSpan = state.compressedSpan;
    }

    if (itemToReport) {
        transformedItems.push(itemToReport);
    }

    state.compressedSpan = undefined;
}

function getSpanItem(compressedSpan: ICompressedSpan, nPlusOneThreshold: number): IWaterfallSpan {
    if (compressedSpan.count === 1) {
        return compressedSpan.originSpan;
    }

    const iriginDoc = compressedSpan.originSpan.doc;
    var antiPattern = false;
    var newSpanName = iriginDoc.span.name;
    if (compressedSpan.query && compressedSpan.count >= nPlusOneThreshold) {
        newSpanName = '(' + compressedSpan.count + 'x) ' + iriginDoc.span.name;
        antiPattern = true;
    } else if (compressedSpan.query) {
        newSpanName = '(' + compressedSpan.count + 'x) ' + iriginDoc.span.name;
    } else {
        newSpanName = compressedSpan.count + 'x calls to ' + compressedSpan.destination;
    }
    const duration = compressedSpan.end - compressedSpan.start;
    const doc = newSpanDoc(iriginDoc, newSpanName, duration, compressedSpan.query);

    return {
        docType: 'span',
        doc: doc,
        id: doc.span.id,
        parentId: compressedSpan.parentId,
        duration: duration,
        durationSum: compressedSpan.duration,
        count: compressedSpan.count,
        nPlusOne: antiPattern,
        offset: 0,
        skew: 0,
        legendValues: compressedSpan.originSpan.legendValues,
        color: compressedSpan.originSpan.color
    };
}

function newSpanDoc(origin: Span, name: string, duration: number, query?: string): Span {
    const db = !query ? origin.span.db : {
        statement: query,
        type: origin.span.db?.type,
    };
    const newId = uuid.v4();
    const spanDoc: Span = {
        agent: origin.agent,
        processor: origin.processor,
        trace: origin.trace,
        service: origin.service,
        timestamp: origin.timestamp,
        '@timestamp': origin['@timestamp'],
        span: {
            destination: origin.span.destination,
            duration: { us: duration },
            id: newId,
            name: name,
            subtype: origin.span.subtype,
            type: origin.span.type,
            sync: origin.span.sync,
            http: origin.span.http,
            db: db,
            message: origin.span.message,
        }
    };

    return spanDoc;
}

interface AlgorithmState {
    compressedSpan?: ICompressedSpan;
    prevCompressedSpan?: ICompressedSpan;
}

interface ICompressedSpan {
    count: number;
    type: string;
    subtype?: string
    destination: string;
    query?: string;
    maxDuration: number;

    parentId: string;
    parent?: IWaterfallItem;

    start: number;
    end: number;
    prevEnd: number;
    /**
     * Latency in us
     */
    duration: number;

    originSpan: IWaterfallSpan;
}

function createWaterfall(origin: IWaterfall, transformedItems: IWaterfallItem[]): IWaterfall {
    const modifiedWaterfall: IWaterfall = {
        entryWaterfallTransaction: origin.entryWaterfallTransaction,
        rootTransaction: origin.rootTransaction,
        duration: origin.duration,
        items: [],
        childrenByParentId: {},
        errorsPerTransaction: origin.errorsPerTransaction,
        errorsCount: origin.errorsCount,
        errorItems: origin.errorItems,
        antipatternDetected: false,
        legends: origin.legends,
    };

    const childrenByParentId = getChildrenGroupedByParentId(
        reparentSpans(getWaterfallItems(transformedItems))
    );

    const items = getOrderedWaterfallItems(
        childrenByParentId,
        modifiedWaterfall.entryWaterfallTransaction
    );

    modifiedWaterfall.antipatternDetected = items.find(item => item.nPlusOne) !== undefined;

    modifiedWaterfall.items = items;
    modifiedWaterfall.childrenByParentId = getChildrenGroupedByParentId(items);

    return modifiedWaterfall;
}

function getWaterfallItems(items: IWaterfallItem[]): IWaterfallSpanOrTransaction[] {
    return items.filter(item => item.docType === 'span' || item.docType === 'transaction')
        .map((item: IWaterfallItem) => item as IWaterfallSpanOrTransaction);
}