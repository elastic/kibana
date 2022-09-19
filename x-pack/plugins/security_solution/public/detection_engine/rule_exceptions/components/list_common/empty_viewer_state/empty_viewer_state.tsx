/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';

import {
  EuiLoadingContent,
  EuiImage,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';
import type { ExpressionColor } from '@elastic/eui/src/components/expression/expression';
import type { EuiFacetGroupLayout } from '@elastic/eui/src/components/facet/facet_group';

import illustration from '../../../../../common/images/illustration_product_no_results_magnifying_glass.svg';
import { ViewerStatus } from '../types';
import * as i18n from '../translations';

interface EmptyViewerStateProps {
  title?: string;
  body?: string;

  buttonText?: string;

  listType?: string;
  isReadOnly: boolean;
  viewerStatus: ViewerStatus;
  onCreateExceptionListItem?: () => void | null;
}

const EmptyViewerStateComponent: FC<EmptyViewerStateProps> = ({
  title,
  body,
  buttonText,

  listType,
  isReadOnly,
  viewerStatus,
  onCreateExceptionListItem,
}) => {
  const { euiTheme } = useEuiTheme();

  const euiEmptyPromptProps = useMemo(() => {
    switch (viewerStatus) {
      case ViewerStatus.ERROR: {
        return {
          color: 'danger' as ExpressionColor,
          iconType: 'alert',
          title: (
            <h2 data-test-subj="error_title">{title || i18n.EMPTY_VIEWER_STATE_ERROR_TITLE}</h2>
          ),
          body: <p data-test-subj="error_body">{body || i18n.EMPTY_VIEWER_STATE_ERROR_BODY}</p>,
          'data-test-subj': 'error_viewer_state',
        };
      }
      case ViewerStatus.EMPTY:
        return {
          color: 'subdued' as ExpressionColor,
          iconType: 'plusInCircle',
          iconColor: euiTheme.colors.darkestShade,
          title: (
            <h2 data-test-subj="empty_title">{title || i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE}</h2>
          ),
          body: <p data-test-subj="empty_body">{body || i18n.EMPTY_VIEWER_STATE_EMPTY_BODY}</p>,
          'data-test-subj': 'empty_viewer_state',
          actions: [
            <EuiButton
              data-test-subj="empty_state_button"
              onClick={onCreateExceptionListItem}
              iconType="plusInCircle"
              color="primary"
              isDisabled={isReadOnly}
              fill
            >
              {buttonText || i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON(listType || 'rule')}
            </EuiButton>,
          ],
        };
      case ViewerStatus.EMPTY_SEARCH:
        return {
          color: 'plain' as ExpressionColor,
          layout: 'horizontal' as EuiFacetGroupLayout,
          hasBorder: true,
          hasShadow: false,
          icon: <EuiImage size="fullWidth" alt="" url={illustration} />,
          title: (
            <h3 data-test-subj="empty_search_title">
              {title || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_TITLE}
            </h3>
          ),
          body: (
            <p data-test-subj="empty_search_body">
              {body || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_BODY}
            </p>
          ),
          'data-test-subj': 'empty_search_viewer_state',
        };
    }
  }, [
    viewerStatus,
    euiTheme.colors.darkestShade,
    title,
    body,
    onCreateExceptionListItem,
    isReadOnly,
    buttonText,
    listType,
  ]);

  if (viewerStatus === ViewerStatus.LOADING || viewerStatus === ViewerStatus.SEARCHING)
    return <EuiLoadingContent lines={4} data-test-subj="loading_viewer_state" />;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      color={viewerStatus === 'empty_search' ? 'subdued' : 'transparent'}
      style={{
        margin: `${euiTheme.size.l} 0`,
        padding: `${euiTheme.size.l} 0`,
      }}
    >
      <EuiEmptyPrompt {...euiEmptyPromptProps} />
    </EuiPanel>
  );
};

export const EmptyViewerState = React.memo(EmptyViewerStateComponent);

EmptyViewerState.displayName = 'EmptyViewerState';
