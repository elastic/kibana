/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ERROR_TITLE, ERROR_MESSAGE } from '../../shared/translations';
import { TimelineTabs } from '../../../../common/types';
import { EventFieldsBrowser } from '../../../common/components/event_details/event_fields_browser';
import { useRightPanelContext } from '../context';
import { TABLE_TAB_ERROR_TEST_ID } from './test_ids';

export const DOCUMENT = i18n.translate('xpack.securitySolution.flyout.analyzer', {
  defaultMessage: 'document information',
});

export const DOCUMENT_DETAILS = i18n.translate('xpack.securitySolution.flyout.analyzer', {
  defaultMessage: 'the document fields and values',
});

/**
 * Table view displayed in the document details expandable flyout right section
 */
export const TableTab: FC = memo(() => {
  const { browserFields, dataFormattedForFieldBrowser, eventId } = useRightPanelContext();

  if (!browserFields || !eventId || !dataFormattedForFieldBrowser) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{ERROR_TITLE(DOCUMENT)}</h2>}
        body={<p>{ERROR_MESSAGE(DOCUMENT_DETAILS)}</p>}
        data-test-subj={TABLE_TAB_ERROR_TEST_ID}
      />
    );
  }

  return (
    <EventFieldsBrowser
      browserFields={browserFields}
      data={dataFormattedForFieldBrowser}
      eventId={eventId}
      isDraggable={false}
      timelineTabType={TimelineTabs.query}
      scopeId={'alert-details-flyout'}
      isReadOnly={false}
    />
  );
});

TableTab.displayName = 'TableTab';
