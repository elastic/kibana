/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { GeoDetector } from './metric_selection';
import { GeoDetectorsSummary } from './metric_selection_summary';
import { GeoSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const GeoView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [geoFieldValid, setGeoFieldValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(geoFieldValid && settingsValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoFieldValid, settingsValid]);

  return (
    <Fragment>
      {isActive === false ? (
        <GeoDetectorsSummary />
      ) : (
        <Fragment>
          <GeoDetector setIsValid={setGeoFieldValid} />

          {geoFieldValid && (
            <Fragment>
              <EuiHorizontalRule margin="l" />
              <GeoSettings setIsValid={setSettingsValid} />
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
