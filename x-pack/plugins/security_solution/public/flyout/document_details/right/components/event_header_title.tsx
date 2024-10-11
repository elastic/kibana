/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { startCase } from 'lodash';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutTitle } from '@kbn/security-solution-common';
import { DocumentSeverity } from './severity';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FLYOUT_EVENT_HEADER_TITLE_TEST_ID } from './test_ids';
import { getField } from '../../shared/utils';
import { EVENT_CATEGORY_TO_FIELD } from '../utils/event_utils';

/**
 * Event details flyout right section header
 */
export const EventHeaderTitle = memo(() => {
  const { dataFormattedForFieldBrowser, getFieldsData } = useDocumentDetailsContext();
  const { timestamp } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const eventKind = getField(getFieldsData('event.kind'));
  const eventCategory = getField(getFieldsData('event.category'));

  const title = useMemo(() => {
    const defaultTitle = i18n.translate('xpack.securitySolution.flyout.right.title.eventTitle', {
      defaultMessage: `Event details`,
    });

    if (eventKind === 'event' && eventCategory) {
      const fieldName = EVENT_CATEGORY_TO_FIELD[eventCategory];
      return getField(getFieldsData(fieldName)) ?? defaultTitle;
    }

    if (eventKind === 'alert') {
      return i18n.translate('xpack.securitySolution.flyout.right.title.alertEventTitle', {
        defaultMessage: 'External alert details',
      });
    }

    return eventKind
      ? i18n.translate('xpack.securitySolution.flyout.right.title.otherEventTitle', {
          defaultMessage: '{eventKind} details',
          values: {
            eventKind: startCase(eventKind),
          },
        })
      : defaultTitle;
  }, [eventKind, getFieldsData, eventCategory]);

  return (
    <>
      <DocumentSeverity />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      <FlyoutTitle
        title={title}
        iconType={'analyzeEvent'}
        data-test-subj={FLYOUT_EVENT_HEADER_TITLE_TEST_ID}
      />
    </>
  );
});

EventHeaderTitle.displayName = 'EventHeaderTitle';
