/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { State } from '../../../common/store';

import { setExcludedRowRendererIds as dispatchSetExcludedRowRendererIds } from '../../../timelines/store/timeline/actions';
import { RowRenderersBrowser } from './row_renderers_browser';
import * as i18n from './translations';
import { FieldBrowserProps } from './types';

const RowRenderersBrowserButtonContainer = styled.div`
  position: relative;
`;

RowRenderersBrowserButtonContainer.displayName = 'RowRenderersBrowserButtonContainer';

export const StatefulRowRenderersBrowserComponent: React.FC<FieldBrowserProps> = ({
  height,
  timelineId,
  width,
}) => {
  console.error('timelineId', timelineId);
  const dispatch = useDispatch();
  const excludedRowRendererIds = useSelector(
    (state: State) => state.timeline.timelineById[timelineId]?.excludedRowRendererIds || []
  );
  const [show, setShow] = useState(false);

  const setExcludedRowRendererIds = useCallback(
    (payload) =>
      dispatch(
        dispatchSetExcludedRowRendererIds({ id: timelineId, excludedRowRendererIds: payload })
      ),
    [dispatch, timelineId]
  );

  const toggleShow = useCallback(() => setShow(!show), [show]);

  const hideFieldBrowser = useCallback(() => setShow(false), []);

  return (
    <>
      <RowRenderersBrowserButtonContainer data-test-subj="fields-browser-button-container">
        <EuiToolTip content={'Customize Event Renderers'}>
          <EuiButtonEmpty
            data-test-subj="show-field-browser"
            iconType="gear"
            onClick={toggleShow}
            size="xs"
          >
            {'Event Renderers'}
          </EuiButtonEmpty>
        </EuiToolTip>

        {show && (
          <RowRenderersBrowser
            height={height}
            onOutsideClick={hideFieldBrowser}
            timelineId={timelineId}
            width={width}
            excludedRowRendererIds={excludedRowRendererIds}
            setExcludedRowRendererIds={setExcludedRowRendererIds}
          />
        )}
      </RowRenderersBrowserButtonContainer>
    </>
  );
};

export const StatefulRowRenderersBrowser = React.memo(StatefulRowRenderersBrowserComponent);
