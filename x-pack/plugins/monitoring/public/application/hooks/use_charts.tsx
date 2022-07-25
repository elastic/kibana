/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { useContext, useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MonitoringTimeContainer } from './use_monitoring_time';

export function useCharts() {
  const { services } = useKibana<{ data: any }>();
  const history = useHistory();
  const { handleTimeChange } = useContext(MonitoringTimeContainer.Context);

  const [zoomInLevel, setZoomInLevel] = useState(0);

  // We need something to know when the onBrush event was fired because the pop state event
  // is also fired when the onBrush event is fired (although only on the first onBrush event) and
  // causing the zoomInLevel to change.
  // In Angular, this was handled by removing the listener before updating the state and adding
  // it again after some milliseconds, but the same trick didn't work in React.
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
