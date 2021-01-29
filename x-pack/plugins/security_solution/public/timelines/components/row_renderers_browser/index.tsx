/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { State } from '../../../common/store';
import { RowRendererId } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { setExcludedRowRendererIds as dispatchSetExcludedRowRendererIds } from '../../store/timeline/actions';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { RowRenderersBrowser } from './row_renderers_browser';
import * as i18n from './translations';

const StyledEuiModal = styled(EuiModal)`
  margin: 0 auto;
  max-width: 95vw;
  min-height: 95vh;

  > .euiModal__flex {
    max-height: 95vh;
  }
`;

const StyledEuiModalBody = styled(EuiModalBody)`
  .euiModalBody__overflow {
    display: flex;
    align-items: stretch;
    overflow: hidden;

    > div {
      display: flex;
      flex-direction: column;
      flex: 1;

      > div:first-child {
        flex: 0;
      }

      .euiBasicTable {
        flex: 1;
        overflow: auto;
      }
    }
  }
`;

const StyledEuiOverlayMask = styled(EuiOverlayMask)`
  z-index: 8001;
  padding-bottom: 0;

  > div {
    width: 100%;
  }
`;

interface StatefulRowRenderersBrowserProps {
  timelineId: string;
}

const StatefulRowRenderersBrowserComponent: React.FC<StatefulRowRenderersBrowserProps> = ({
  timelineId,
}) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const excludedRowRendererIds = useDeepEqualSelector(
    (state: State) => (getTimeline(state, timelineId) ?? timelineDefaults).excludedRowRendererIds
  );
  const [show, setShow] = useState(false);

  const setExcludedRowRendererIds = useCallback(
    (payload) =>
      dispatch(
        dispatchSetExcludedRowRendererIds({
          id: timelineId,
          excludedRowRendererIds: payload,
        })
      ),
    [dispatch, timelineId]
  );

  const toggleShow = useCallback(() => setShow(!show), [show]);

  const hideFieldBrowser = useCallback(() => setShow(false), []);

  const handleDisableAll = useCallback(() => {
    setExcludedRowRendererIds(Object.values(RowRendererId));
  }, [setExcludedRowRendererIds]);

  const handleEnableAll = useCallback(() => {
    setExcludedRowRendererIds([]);
  }, [setExcludedRowRendererIds]);

  return (
    <>
      <EuiToolTip content={i18n.CUSTOMIZE_EVENT_RENDERERS_TITLE}>
        <EuiButtonIcon
          aria-label={i18n.CUSTOMIZE_EVENT_RENDERERS_TITLE}
          data-test-subj="show-row-renderers-gear"
          iconType="gear"
          onClick={toggleShow}
        >
          {i18n.EVENT_RENDERERS_TITLE}
        </EuiButtonIcon>
      </EuiToolTip>

      {show && (
        <StyledEuiOverlayMask>
          <StyledEuiModal onClose={hideFieldBrowser}>
            <EuiModalHeader>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                direction="row"
                gutterSize="none"
              >
                <EuiFlexItem grow={false}>
                  <EuiModalHeaderTitle>{i18n.CUSTOMIZE_EVENT_RENDERERS_TITLE}</EuiModalHeaderTitle>
                  <EuiText size="s">{i18n.CUSTOMIZE_EVENT_RENDERERS_DESCRIPTION}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        data-test-subj="disable-all"
                        onClick={handleDisableAll}
                      >
                        {i18n.DISABLE_ALL}
                      </EuiButtonEmpty>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiButton
                        fill
                        size="s"
                        data-test-subj="enable-all"
                        onClick={handleEnableAll}
                      >
                        {i18n.ENABLE_ALL}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiModalHeader>

            <StyledEuiModalBody>
              <RowRenderersBrowser
                excludedRowRendererIds={excludedRowRendererIds}
                setExcludedRowRendererIds={setExcludedRowRendererIds}
              />
            </StyledEuiModalBody>
          </StyledEuiModal>
        </StyledEuiOverlayMask>
      )}
    </>
  );
};

export const StatefulRowRenderersBrowser = React.memo(StatefulRowRenderersBrowserComponent);
