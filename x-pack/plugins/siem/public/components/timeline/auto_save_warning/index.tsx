/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiGlobalToastListToast as Toast,
} from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { State, timelineSelectors } from '../../../store';
import { setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker } from '../../../store/inputs/actions';

import * as i18n from './translations';
import { timelineActions } from '../../../store/timeline';
import { AutoSavedWarningMsg } from '../../../store/timeline/types';
import { useStateToaster } from '../../toasters';

const AutoSaveWarningMsgComponent = React.memo<PropsFromRedux>(
  ({
    newTimelineModel,
    setTimelineRangeDatePicker,
    timelineId,
    updateAutoSaveMsg,
    updateTimeline,
  }) => {
    const dispatchToaster = useStateToaster()[1];
    if (timelineId != null && newTimelineModel != null) {
      const toast: Toast = {
        id: 'AutoSaveWarningMsg',
        title: i18n.TITLE,
        color: 'warning',
        iconType: 'alert',
        toastLifeTimeMs: 10000,
        text: (
          <>
            <p>{i18n.DESCRIPTION}</p>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={() => {
                    updateTimeline({ id: timelineId, timeline: newTimelineModel });
                    updateAutoSaveMsg({ timelineId: null, newTimelineModel: null });
                    setTimelineRangeDatePicker({
                      from: getOr(0, 'dateRange.start', newTimelineModel),
                      to: getOr(0, 'dateRange.end', newTimelineModel),
                    });
                  }}
                >
                  {i18n.REFRESH_TIMELINE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ),
      };
      dispatchToaster({
        type: 'addToaster',
        toast,
      });
    }

    return null;
  }
);

AutoSaveWarningMsgComponent.displayName = 'AutoSaveWarningMsgComponent';

const mapStateToProps = (state: State) => {
  const autoSaveMessage: AutoSavedWarningMsg = timelineSelectors.autoSaveMsgSelector(state);

  return {
    timelineId: autoSaveMessage.timelineId,
    newTimelineModel: autoSaveMessage.newTimelineModel,
  };
};

const mapDispatchToProps = {
  setTimelineRangeDatePicker: dispatchSetTimelineRangeDatePicker,
  updateAutoSaveMsg: timelineActions.updateAutoSaveMsg,
  updateTimeline: timelineActions.updateTimeline,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AutoSaveWarningMsg = connector(AutoSaveWarningMsgComponent);
