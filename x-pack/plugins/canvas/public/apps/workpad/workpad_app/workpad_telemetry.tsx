/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
// @ts-ignore
import { trackCanvasUiMetric } from '../../../lib/ui_metric';
// @ts-ignore
import { getElementCounts } from '../../../state/selectors/workpad';
// @ts-ignore
import { getArgs } from '../../../state/selectors/resolved_args';

const WorkpadLoadedMetric = 'workpad-loaded';
const WorkpadLoadedWithErrorsMetric = 'workpad-loaded-with-errors';

export { WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric };

const mapStateToProps = (state: any) => ({
  telemetryElementCounts: getElementCounts(state),
  telemetryResolvedArgs: getArgs(state),
});

interface ElementCounts {
  error: number;
  pending: number;
  ready: number;
}

interface WorkpadPage {
  elements: Array<{ id: string }>;
}

interface Workpad {
  pages: WorkpadPage[];
  id: string;
}

interface ResolvedArgs {
  [keys: string]: any;
}

interface ElementsLoadedTelemetryProps {
  telemetryElementCounts: ElementCounts;
  workpad: Workpad;
  telemetryResolvedArgs: {};
}

function areAllElementsInResolvedArgs(workpad: Workpad, resolvedArgs: ResolvedArgs) {
  const resolvedArgsElements = new Set(Object.keys(resolvedArgs));

  const workpadElements = workpad.pages.reduce<string[]>((reduction, page) => {
    return [...reduction, ...page.elements.map(element => element.id)];
  }, []);

  return workpadElements.every(element => resolvedArgsElements.has(element));
}

const withElementsLoadedTelemetry = <P extends object>(
  Component: React.ComponentType<P>,
  trackMetric: (metric: string | string[]) => void = trackCanvasUiMetric
) => {
  return function ElementsLoadedTelemetry(props: P & ElementsLoadedTelemetryProps) {
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

const connectedTelemetryHOC = <P extends object>(Component: React.ComponentType<P>) => {
  const telemetry = withElementsLoadedTelemetry(Component);
  return connect(mapStateToProps)(telemetry);
};

export {
  connectedTelemetryHOC as withElementsLoadedTelemetry,
  withElementsLoadedTelemetry as _unconnectedWithElementsLoadedTelemetry,
};
