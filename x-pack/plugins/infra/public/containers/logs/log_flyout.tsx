/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { isString } from 'lodash';
import React, { useCallback, useState } from 'react';
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
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [logEntryId, setLogEntryId] = useState<string | null>(null);
  const [surroundingLogsId, setSurroundingLogsId] = useState<string | null>(null);

  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);
  const openFlyout = useCallback((newLogEntryId?: string) => {
    if (newLogEntryId) {
      setLogEntryId(newLogEntryId);
    }
    setIsFlyoutOpen(true);
  }, []);

  return {
    isFlyoutOpen,
    closeFlyout,
    openFlyout,
    logEntryId,
    setLogEntryId,
    surroundingLogsId,
    setSurroundingLogsId,
  };
};

export const LogFlyout = createContainer(useLogFlyout);
export const [LogEntryFlyoutProvider, useLogEntryFlyoutContext] = LogFlyout;

export const WithFlyoutOptionsUrlState = () => {
  const {
    isFlyoutOpen,
    openFlyout,
    closeFlyout,
    logEntryId,
    setLogEntryId,
    surroundingLogsId,
    setSurroundingLogsId,
  } = useLogEntryFlyoutContext();

  return (
    <UrlStateContainer
      urlState={{
        flyoutVisibility: isFlyoutOpen ? FlyoutVisibility.visible : FlyoutVisibility.hidden,
        flyoutId: logEntryId,
        surroundingLogsId,
      }}
      urlStateKey="flyoutOptions"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState) => {
        if (newUrlState && newUrlState.flyoutId) {
          setLogEntryId(newUrlState.flyoutId);
        }
        if (newUrlState && newUrlState.surroundingLogsId) {
          setSurroundingLogsId(newUrlState.surroundingLogsId);
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          openFlyout();
        }
        if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          closeFlyout();
        }
      }}
      onInitialize={(initialUrlState) => {
        if (initialUrlState && initialUrlState.flyoutId) {
          setLogEntryId(initialUrlState.flyoutId);
        }
        if (initialUrlState && initialUrlState.surroundingLogsId) {
          setSurroundingLogsId(initialUrlState.surroundingLogsId);
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.visible) {
          openFlyout();
        }
        if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
          closeFlyout();
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
