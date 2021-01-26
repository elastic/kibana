/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { TourStepMessage, TOUR_MESSAGES } from './search_session_indicator_tour_content';
import { ISessionService } from '../../../../../../../src/plugins/data/public/';
import { IStorageWrapper } from '../../../../../../../src/plugins/kibana_utils/public/';
import { SearchSessionIndicator, SearchSessionIndicatorProps } from '../search_session_indicator';

export interface SearchSessionIndicatoWithTourProps extends SearchSessionIndicatorProps {
  sessionService: ISessionService;
  storage: IStorageWrapper;
}

export function SearchSessionIndicatorWithTour(props: SearchSessionIndicatoWithTourProps) {
  const { storage, sessionService, ...searchSessionProps } = props;
  const [tourStepVisible, setTourStepVisible] = useState(false);
  const curSearchTimer = useRef<NodeJS.Timeout>();
  const curTour = useRef<TourStepMessage | undefined>();
  const curSearchSessionState = useObservable(props.sessionService.state$);

  const onTourClose = useCallback(() => {
    setTourStepVisible(false);
  }, []);

  const onTourDismiss = useCallback(() => {
    if (curTour.current) {
      props.storage.set(curTour.current.storageKey, true);
      setTourStepVisible(false);
    }
  }, [props.storage]);

  useEffect(() => {
    // don't dismiss open tour steps
    if (!tourStepVisible) {
      if (curSearchTimer.current) {
        clearTimeout(curSearchTimer.current);
        curSearchTimer.current = undefined;
      }

      curTour.current = TOUR_MESSAGES[curSearchSessionState || ''];
      if (!curTour.current) return;

      const tourStepDismissed = !!props.storage.get(curTour.current.storageKey);
      if (tourStepDismissed) return;

      // Show tour step
      const { delay } = curTour.current;
      if (delay) {
        curSearchTimer.current = setTimeout(() => setTourStepVisible(true), delay);
      } else {
        setTourStepVisible(true);
      }
    }
  }, [props.storage, tourStepVisible, curSearchSessionState]);

  return tourStepVisible ? (
    <EuiTourStep
      data-test-subj="searchSessionIndicatorTour"
      isStepOpen={tourStepVisible}
      step={1}
      onFinish={() => {}}
      stepsTotal={1}
      minWidth={300}
      anchorPosition="downCenter"
      anchorClassName="eui-displayBlock"
      closePopover={onTourClose}
      title={curTour.current?.title || ''}
      subtitle={''}
      content={
        <EuiText data-test-subj={curSearchSessionState} size="s">
          <p style={{ maxWidth: 300 }}>{curTour.current?.message}</p>
        </EuiText>
      }
      footerAction={
        <EuiButtonEmpty
          size="xs"
          flush="right"
          color="text"
          data-test-subj="searchSessionsPopoverDismissButton"
          onClick={onTourDismiss}
        >
          {i18n.translate('xpack.data.searchSessionIndicator.tour.dismissAction', {
            defaultMessage: "Don't show again",
          })}
        </EuiButtonEmpty>
      }
    >
      <SearchSessionIndicator {...searchSessionProps} />
    </EuiTourStep>
  ) : (
    <SearchSessionIndicator {...searchSessionProps} />
  );
}
