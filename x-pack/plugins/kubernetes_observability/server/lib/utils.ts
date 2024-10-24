/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { double } from "@elastic/elasticsearch/lib/api/types";

export type Event = {
    note: string;
    reason: string;
    type: string;
    time: string;
    kind: string;
    object: string;
};

export type Pod = {
    message: string;
    state: string;
    namespace: string;
    time: string;
    name: string;
    node: string;
    failingReason: Event;
    logref: string
};

export type Deployment = {
    message: string;
    namespace: string;
    time: string;
    name: string;
    replicasAvailable: string;
    replicasDesired: string;
    reason: string
    events: Event[];
};

export type Daemonset = {
    message: string;
    namespace: string;
    time: string;
    name: string;
    readyNodes: string;
    desiredNodes: string;
    reason: string
    events: Event[];
};

export type PodMem = {
    name: string;
    namespace: string;
    node: string;
    memory_available: number | undefined;
    memory_usage: number | undefined;
    memory_usage_median_deviation: number| undefined;
    memory_utilization: number| undefined;
    message: string | undefined;
    reason: string | undefined;
    alarm: string | undefined;
    deviation_alarm: string | undefined;
}

export type PodCpu = {
    name: string;
    namespace: string;
    node: string;
    cpu_utilization: number| undefined;
    cpu_utilization_median_deviation: number| undefined;
    message: string | undefined;
    reason: string | undefined;
    alarm: string | undefined;
    deviation_alarm: string | undefined;
}

// export type PodCpu = {
//     name: string;
//     namespace: string;
//     node: string;
//     cpu_utilization: {
//         min: number | undefined;
//         max: number | undefined
//         avg: number | undefined
//         median_absolute_deviation: number | undefined;
//     },
//     reason: {
//         cpu_utilisation: string | undefined;
//         cpu_utilisation_median_absolute_deviation: String | undefined;
//     },
//     message: string | undefined; 
// }

export type Node = {
    name: string;
    memory_available: number | undefined;
    memory_usage: number | undefined;
    cpu_utilization: number | undefined;
};

export type NodeCpu = {
    name: string;
    cpu_utilization: number | undefined;
    cpu_utilization_median_deviation: number | undefined;
    alarm: string | undefined;
    message: string | undefined;
    reason: string | undefined;
};

export type NodeMem = {
    name: string;
    memory_available: number | undefined;
    memory_usage: number | undefined;
    memory_utilization: number| undefined;
    memory_usage_median_deviation: number| undefined;
    alarm: string | undefined;
    message: string | undefined;
    reason: string | undefined;
};

export type Limits = {
    [key: string]: double;
};

export function extractFieldValue<T>(maybeArray: T | T[] | undefined): T {
    return toArray(maybeArray)[0];
}

function toArray<T>(maybeArray: T | T[] | undefined): T[] {
    if (!maybeArray) {
        return [];
    }
    if (Array.isArray(maybeArray)) {
        return maybeArray;
    }
    return [maybeArray];
}

export function phaseToState(phase: number) {
    switch (phase) {
        case 1: {
            return "Pending";
        }
        case 2: {
            return "Running";
        }
        case 3: {
            return "Succeeded";
        }
        case 4: {
            return "Failed";
        }
        case 5: {
            return "Unknown";
        }
        default: {
            return "Unknown";
        }
    }
}

export function conStatusToState(phase: number) {
    switch (phase) {
        case 1: {
            return "Ready";
        }
        case 0: {
            return "Not Ready";
        }
        default: {
            return "Unknown";
        }
    }
}

export function round(num: number, decimalPlaces = 0): number {
    var p = Math.pow(10, decimalPlaces);
    var n = (num * p) * (1 + Number.EPSILON);
    return Math.round(n) / p;
}

export function toEntries<T>(a: T[]) {
    return a.map((value, index) => [index, value] as const);
}

export function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function median(arr: number[]): number | undefined {
    if (!arr.length) return undefined;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : ((s[mid - 1] + s[mid]) / 2);
};

export function checkDefaultNamespace(namespace: string | undefined): string {
    if (namespace == null || namespace == undefined || namespace == '') {
        return namespace = "default"
    } else {
        return namespace
    }
}


export function checkDefaultPeriod(period: string | undefined): string {
    if (period == null || period == undefined || period == '') {
        return period = "now-5m"
    } else {
        return period
    }
}

export function toPct(num: number | undefined): number | undefined {
    return num === undefined ? undefined : num * 100;
}

