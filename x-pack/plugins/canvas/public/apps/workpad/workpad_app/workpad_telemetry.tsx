/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
// @ts-ignore: Local Untyped
import { trackCanvasUiMetric } from '../../../lib/ui_metric';
// @ts-ignore: Local Untyped
import { getElementCounts } from '../../../state/selectors/workpad';
// @ts-ignore: Local Untyped
import { getArgs } from '../../../state/selectors/resolved_args';

const WorkpadLoadedMetric = 'workpad-loaded';
const WorkpadLoadedWithErrorsMetric = 'workpad-loaded-with-errors';

export { WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric };

const mapStateToProps = (state: any) => ({
  telemetryElementCounts: getElementCounts(state),
  telemetryResolvedArgs: getArgs(state),
});

/**
  Counts of the loading states of workpad elements
*/
interface ElementCounts {
  /** Count of elements in error state */
  error: number;
  /** Count of elements in pending state */
  pending: number;
  /** Count of elements in ready state */
  ready: number;
}

// TODO: Build out full workpad types
/**
  Individual Page of a Workpad
 */
interface WorkpadPage {
  /** The elements on this Workpad Page */
  elements: Array<{ id: string }>;
}

/**
 A canvas workpad object
 */
interface Workpad {
  /** The pages of the workpad */
  pages: WorkpadPage[];
  /** The ID of the workpad */
  id: string;
}

/**
 Collection of resolved elements
 */
interface ResolvedArgs {
  [keys: string]: any;
}

interface ElementsLoadedTelemetryProps {
  telemetryElementCounts: ElementCounts;
  workpad: Workpad;
  telemetryResolvedArgs: {};
}

function areAllElementsInResolvedArgs(workpad: Workpad, resolvedArgs: ResolvedArgs): boolean {
  const resolvedArgsElements = Object.keys(resolvedArgs);

  const workpadElements = workpad.pages.reduce<string[]>((reduction, page) => {
    return [...reduction, ...page.elements.map(element => element.id)];
  }, []);

  return workpadElements.every(element => resolvedArgsElements.includes(element));
}

export const withUnconnectedElementsLoadedTelemetry = function<P extends object>(
  Component: React.ComponentType<P>,
  trackMetric: (metric: string | string[]) => void = trackCanvasUiMetric
): React.SFC<P & ElementsLoadedTelemetryProps> {
  return function ElementsLoadedTelemetry(
    props: P & ElementsLoadedTelemetryProps
  ): React.SFCElement<P> {
    const { telemetryElementCounts, workpad, telemetryResolvedArgs, ...other } = props;

    const [currentWorkpadId, setWorkpadId] = useState<string | undefined>(undefined);
    const [hasReported, setHasReported] = useState(false);

    useEffect(() => {
      const resolvedArgsAreForWorkpad = areAllElementsInResolvedArgs(
        workpad,
        telemetryResolvedArgs
      );

      if (workpad.id !== currentWorkpadId) {
        setWorkpadId(workpad.id);

        const workpadElementCount = workpad.pages.reduce(
          (reduction, page) => reduction + page.elements.length,
          0
        );

        if (
          workpadElementCount === 0 ||
          (resolvedArgsAreForWorkpad && telemetryElementCounts.pending === 0)
        ) {
          setHasReported(true);
        } else {
          setHasReported(false);
        }
      } else if (
        !hasReported &&
        telemetryElementCounts.pending === 0 &&
        resolvedArgsAreForWorkpad
      ) {
        if (telemetryElementCounts.error > 0) {
          trackMetric([WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric]);
        } else {
          trackMetric(WorkpadLoadedMetric);
        }

        setHasReported(true);
      }
    });

    return <Component {...other as P} workpad={workpad} />;
  };
};

export const withElementsLoadedTelemetry = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const telemetry = withUnconnectedElementsLoadedTelemetry(Component);
  return connect(mapStateToProps)(telemetry);
};
