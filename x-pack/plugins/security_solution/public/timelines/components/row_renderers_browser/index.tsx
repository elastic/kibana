/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
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

import type { State } from '../../../common/store';
import { RowRendererValues } from '../../../../common/api/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { setExcludedRowRendererIds as dispatchSetExcludedRowRendererIds } from '../../store/actions';
import { timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import { RowRenderersBrowser } from './row_renderers_browser';
import * as i18n from './translations';

const StyledEuiModal = styled(EuiModal)`
  ${({ theme }) => `margin-top: ${theme.eui.euiSizeXXL};`}
  max-width: 95vw;
  min-height: 90vh;

  > .euiModal__flex {
    max-height: 90vh;
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
    setExcludedRowRendererIds(RowRendererValues);
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
        <StyledEuiModal onClose={hideFieldBrowser} data-test-subj="row-renderers-modal">
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
                    <EuiButton fill size="s" data-test-subj="enable-all" onClick={handleEnableAll}>
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
      )}
    </>
  );
};

export const StatefulRowRenderersBrowser = React.memo(StatefulRowRenderersBrowserComponent);
