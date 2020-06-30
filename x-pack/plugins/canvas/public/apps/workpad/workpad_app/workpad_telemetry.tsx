/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../../lib/ui_metric';
import { getElementCounts } from '../../../state/selectors/workpad';
import { getArgs } from '../../../state/selectors/resolved_args';

const WorkpadLoadedMetric = 'workpad-loaded';
const WorkpadLoadedWithErrorsMetric = 'workpad-loaded-with-errors';

export { WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric };

const mapStateToProps = (state: any) => ({
  telemetryElementCounts: getElementCounts(state),
  telemetryResolvedArgs: getArgs(state),
});

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

interface ElementsLoadedTelemetryProps extends PropsFromRedux {
  workpad: Workpad;
}

function areAllElementsInResolvedArgs(workpad: Workpad, resolvedArgs: ResolvedArgs): boolean {
  const resolvedArgsElements = Object.keys(resolvedArgs);

  const workpadElements = workpad.pages.reduce<string[]>((reduction, page) => {
    return [...reduction, ...page.elements.map((element) => element.id)];
  }, []);

  return workpadElements.every((element) => resolvedArgsElements.includes(element));
}

export const withUnconnectedElementsLoadedTelemetry = <P extends {}>(
  Component: React.ComponentType<P>,
  trackMetric = trackCanvasUiMetric
) =>
  function ElementsLoadedTelemetry(props: ElementsLoadedTelemetryProps) {
    const { telemetryElementCounts, workpad, telemetryResolvedArgs, ...other } = props;
    const { error, pending } = telemetryElementCounts;

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

        if (workpadElementCount === 0 || (resolvedArgsAreForWorkpad && pending === 0)) {
          setHasReported(true);
        } else {
          setHasReported(false);
        }
      } else if (!hasReported && pending === 0 && resolvedArgsAreForWorkpad) {
        if (error > 0) {
          trackMetric(METRIC_TYPE.LOADED, [WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric]);
        } else {
          trackMetric(METRIC_TYPE.LOADED, WorkpadLoadedMetric);
        }
        setHasReported(true);
      }
    }, [currentWorkpadId, hasReported, error, pending, telemetryResolvedArgs, workpad]);

    return <Component {...(other as P)} workpad={workpad} />;
  };

const connector = connect(mapStateToProps, {});

type PropsFromRedux = ConnectedProps<typeof connector>;

export const withElementsLoadedTelemetry = <P extends {}>(Component: React.ComponentType<P>) => {
  const telemetry = withUnconnectedElementsLoadedTelemetry(Component);
  return connector(telemetry);
};
