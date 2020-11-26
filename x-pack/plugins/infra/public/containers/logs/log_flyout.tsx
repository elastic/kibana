/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { isString } from 'lodash';
import React, { useState } from 'react';
import { UrlStateContainer } from '../../utils/url_state';

export enum FlyoutVisibility {
  hidden = 'hidden',
  visible = 'visible',
}

export interface FlyoutOptionsUrlState {
  flyoutId?: string | null;
  flyoutVisibility?: string | null;
  surroundingLogsId?: string | null;
}

export const useLogFlyout = () => {
  const [flyoutVisible, setFlyoutVisibility] = useState<boolean>(false);
  const [logEntryId, setLogEntryId] = useState<string | null>(null);
  const [surroundingLogsId, setSurroundingLogsId] = useState<string | null>(null);

  return {
    isVisible: flyoutVisible,
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId: logEntryId,
    setFlyoutId: setLogEntryId,
    surroundingLogsId,
    setSurroundingLogsId,
  };
};

export const LogFlyout = createContainer(useLogFlyout);
export const [LogEntryFlyoutProvider, useLogEntryFlyoutContext] = LogFlyout;

export const WithFlyoutOptionsUrlState = () => {
  const {
    flyoutVisible,
    setFlyoutVisibility,
    flyoutId,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
  } = useLogEntryFlyoutContext();

  return (
    <UrlStateContainer
      urlState={{
        flyoutVisibility: flyoutVisible ? FlyoutVisibility.visible : FlyoutVisibility.hidden,
        flyoutId,
        surroundingLogsId,
      }}
      urlStateKey="flyoutOptions"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState) => {
        if (newUrlState && newUrlState.flyoutId) {
          setFlyoutId(newUrlState.flyoutId);
        }
        if (newUrlState && newUrlState.surroundingLogsId) {
          setSurroundingLogsId(newUrlState.surroundingLogsId);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
      onInitialize={(initialUrlState) => {
        if (initialUrlState && initialUrlState.flyoutId) {
          setFlyoutId(initialUrlState.flyoutId);
        }
        if (initialUrlState && initialUrlState.surroundingLogsId) {
          setSurroundingLogsId(initialUrlState.surroundingLogsId);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          setFlyoutVisibility(true);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          setFlyoutVisibility(false);
        }
      }}
    />
  );
};

const mapToUrlState = (value: any): FlyoutOptionsUrlState | undefined =>
  value
    ? {
        flyoutId: mapToFlyoutIdState(value.flyoutId),
        flyoutVisibility: mapToFlyoutVisibilityState(value.flyoutVisibility),
        surroundingLogsId: mapToSurroundingLogsIdState(value.surroundingLogsId),
      }
    : undefined;

const mapToFlyoutIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToSurroundingLogsIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToFlyoutVisibilityState = (subject: any) => {
  if (subject) {
    if (subject === 'visible') {
      return FlyoutVisibility.visible;
    }
    if (subject === 'hidden') {
      return FlyoutVisibility.hidden;
    }
  }
};
