/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { TableId } from '@kbn/securitysolution-data-table';
import { EuiLink, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import {
  ANCESTOR_INDEX,
  ENTRY_LEADER_ENTITY_ID,
  ENTRY_LEADER_START,
} from '../../shared/constants/field_names';
import { getField } from '../../shared/utils';
import {
  SESSION_VIEW_TEST_ID,
  SESSION_VIEW_UPSELL_TEST_ID,
  SESSION_VIEW_NO_DATA_TEST_ID,
} from './test_ids';
import { isActiveTimeline } from '../../../../helpers';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { detectionsTimelineIds } from '../../../../timelines/containers/helpers';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';
import { useLicense } from '../../../../common/hooks/use_license';
import { useSessionPreview } from '../../right/hooks/use_session_preview';

export const SESSION_VIEW_ID = 'session-view';

/**
 * Session view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const SessionView: FC = () => {
  const { sessionView, telemetry } = useKibana().services;
  const { getFieldsData, indexName, scopeId, dataFormattedForFieldBrowser } =
    useDocumentDetailsContext();

  const { euiTheme } = useEuiTheme();

  const sessionViewConfig = useSessionPreview({ getFieldsData, dataFormattedForFieldBrowser });
  const isEnterprisePlus = useLicense().isEnterprise();
  const isEnabled = sessionViewConfig && isEnterprisePlus;

  const ancestorIndex = getField(getFieldsData(ANCESTOR_INDEX)); // e.g in case of alert, we want to grab it's origin index
  const sessionEntityId = getField(getFieldsData(ENTRY_LEADER_ENTITY_ID)) || '';
  const sessionStartTime = getField(getFieldsData(ENTRY_LEADER_START)) || '';
  const index = ancestorIndex || indexName;

  const sourcererScope = useMemo(() => {
    if (isActiveTimeline(scopeId)) {
      return SourcererScopeName.timeline;
    } else if (detectionsTimelineIds.includes(scopeId as TableId)) {
      return SourcererScopeName.detections;
    } else {
      return SourcererScopeName.default;
    }
  }, [scopeId]);

  const { selectedPatterns } = useSourcererDataView(sourcererScope);
  const eventDetailsIndex = useMemo(() => selectedPatterns.join(','), [selectedPatterns]);

  const { openPreviewPanel } = useExpandableFlyoutApi();
  const openAlertDetailsPreview = useCallback(
    (eventId?: string, onClose?: () => void) => {
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: eventId,
          indexName: eventDetailsIndex,
          scopeId,
          banner: ALERT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
      telemetry.reportDetailsFlyoutOpened({
        location: scopeId,
        panel: 'preview',
      });
    },
    [openPreviewPanel, eventDetailsIndex, scopeId, telemetry]
  );

  const noSessionMessage = !isEnterprisePlus ? (
    <div data-test-subj={SESSION_VIEW_UPSELL_TEST_ID}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualizations.sessionViewer.upsellDescription"
        defaultMessage="This feature requires an {subscription}"
        values={{
          subscription: (
            <EuiLink href="https://www.elastic.co/pricing/" target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.visualizations.sessionViewer.upsellLinkText"
                defaultMessage="Enterprise subscription"
              />
            </EuiLink>
          ),
        }}
      />
    </div>
  ) : !sessionViewConfig ? (
    <div data-test-subj={SESSION_VIEW_NO_DATA_TEST_ID}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.visualizations.sessionViewer.noDataDescription"
        defaultMessage="You can only view Linux session details if you’ve enabled the {setting} setting in your Elastic Defend integration policy. Refer to {link} for more information."
        values={{
          setting: (
            <span
              css={css`
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.visualizations.sessionViewer.noDataSettingDescription"
                defaultMessage="Include session data"
              />
            </span>
          ),
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/session-view.html#enable-session-view"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.visualizations.sessionPreview.noDataLinkText"
                defaultMessage="Enable Session View data"
              />
            </EuiLink>
          ),
        }}
      />
    </div>
  ) : null;

  return isEnabled ? (
    <div data-test-subj={SESSION_VIEW_TEST_ID}>
      {sessionView.getSessionView({
        index,
        sessionEntityId,
        sessionStartTime,
        isFullScreen: true,
        loadAlertDetails: openAlertDetailsPreview,
      })}
    </div>
  ) : (
    noSessionMessage
  );
};

SessionView.displayName = 'SessionView';
