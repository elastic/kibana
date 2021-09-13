/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { useContext, useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { MonitoringTimeContainer } from '../hooks/use_monitoring_time';

export function useCharts() {
  const { services } = useKibana<{ data: any }>();
  const history = useHistory();
  const { handleTimeChange } = useContext(MonitoringTimeContainer.Context);

  const [zoomInLevel, setZoomInLevel] = useState(0);
  const [onBrushHappened, _setOnBrushHappened] = useState(false);

  const onBrushHappenedRef = useRef(onBrushHappened);

  const setOnBrushHappened = (data: boolean) => {
    onBrushHappenedRef.current = data;
    _setOnBrushHappened(data);
  };

  useEffect(() => {
    const popstateHandler = () => {
      if (onBrushHappenedRef.current) {
        setOnBrushHappened(false);
      } else {
        setZoomInLevel((currentZoomInLevel) => {
          if (currentZoomInLevel > 0) {
            return currentZoomInLevel - 1;
          }
          return 0;
        });
      }
    };

    window.addEventListener('popstate', popstateHandler);
    return () => window.removeEventListener('popstate', popstateHandler);
  }, []);

  const onBrush = ({ xaxis }: any) => {
    const { to, from } = xaxis;
    const timezone = services.uiSettings?.get('dateFormat:tz');
    const offset = getOffsetInMS(timezone);
    const fromTime = moment(from - offset);
    const toTime = moment(to - offset);
    handleTimeChange(fromTime.toISOString(), toTime.toISOString());
    setOnBrushHappened(true);
    setZoomInLevel(zoomInLevel + 1);
  };

  const zoomInfo = {
    zoomOutHandler: () => history.goBack(),
    showZoomOutBtn: () => zoomInLevel > 0,
  };

  return {
    onBrush,
    zoomInfo,
  };
}

const getOffsetInMS = (timezone: string) => {
  if (timezone === 'Browser') {
    return 0;
  }
  const offsetInMinutes = moment.tz(timezone).utcOffset();
  const offsetInMS = offsetInMinutes * 1 * 60 * 1000;
  return offsetInMS;
};
