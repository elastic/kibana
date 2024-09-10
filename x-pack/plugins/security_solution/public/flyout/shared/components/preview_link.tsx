/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { getEcsField } from '../../document_details/right/components/table_field_name_cell';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from '../../document_details/shared/components/test_ids';
import { HostPreviewPanelKey } from '../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../document_details/right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../document_details/right/components/user_entity_overview';
import { NetworkPanelKey, NETWORK_PREVIEW_BANNER } from '../../network_details';

// Helper function to check if the field has a preview link
export const hasPreview = (field: string) =>
  field === HOST_NAME_FIELD_NAME ||
  field === USER_NAME_FIELD_NAME ||
  getEcsField(field)?.type === IP_FIELD_TYPE;

interface PreviewParams {
  id: string;
  params: Record<string, unknown>;
}

// Helper get function to get the preview parameters
const getPreviewParams = (value: string, field: string, scopeId: string): PreviewParams | null => {
  if (getEcsField(field)?.type === IP_FIELD_TYPE) {
    return {
      id: NetworkPanelKey,
      params: {
        ip: value,
        flowTarget: field.includes(FlowTargetSourceDest.destination)
          ? FlowTargetSourceDest.destination
          : FlowTargetSourceDest.source,
        banner: NETWORK_PREVIEW_BANNER,
      },
    };
  }
  switch (field) {
    case HOST_NAME_FIELD_NAME:
      return {
        id: HostPreviewPanelKey,
        params: { hostName: value, scopeId, banner: HOST_PREVIEW_BANNER },
      };
    case USER_NAME_FIELD_NAME:
      return {
        id: UserPreviewPanelKey,
        params: { userName: value, scopeId, banner: USER_PREVIEW_BANNER },
      };
    default:
      return null;
  }
};

interface PreviewLinkProps {
  /**
   * Highlighted field's field name
   */
  field: string;
  /**
   * Highlighted field's value to display as a EuiLink to open the expandable left panel
   * (used for host name and username fields)
   */
  value: string;
  /**
   * Scope id to use for the preview panel
   */
  scopeId: string;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React components to render, if none provided, the value will be rendered
   */
  children?: React.ReactNode;
}

/**
 * Renders a preview link for entities and ip addresses
 */
export const PreviewLink: FC<PreviewLinkProps> = ({
  field,
  value,
  scopeId,
  children,
  'data-test-subj': dataTestSubj = FLYOUT_PREVIEW_LINK_TEST_ID,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;

  const onClick = useCallback(() => {
    const previewParams = getPreviewParams(value, field, scopeId);
    if (previewParams) {
      openPreviewPanel({
        id: previewParams.id,
        params: previewParams.params,
      });
      telemetry.reportDetailsFlyoutOpened({
        location: scopeId,
        panel: 'preview',
      });
    }
  }, [field, scopeId, value, telemetry, openPreviewPanel]);

  if (!hasPreview(field)) {
    return <>{children ?? value}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? value}
    </EuiLink>
  );
};
