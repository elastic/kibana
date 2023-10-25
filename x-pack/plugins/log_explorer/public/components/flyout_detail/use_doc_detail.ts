/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutContentProps } from '@kbn/discover-plugin/public';
import { formatFieldValue } from '@kbn/discover-utils';
import { LOG_LEVEL_FIELD, MESSAGE_FIELD, TIMESTAMP_FIELD } from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { FlyoutDoc, LogDocument } from './types';

export function useDocDetail(
  doc: LogDocument,
  { dataView }: Pick<FlyoutContentProps, 'dataView'>
): FlyoutDoc {
  const { services } = useKibanaContextForPlugin();

  const formatField = (field: keyof LogDocument['flattened']) => {
    return (
      doc.flattened[field] &&
      formatFieldValue(
        doc.flattened[field],
        doc.raw,
        services.fieldFormats,
        dataView,
        dataView.fields.getByName(field)
      )
    );
  };

  const level = formatField(LOG_LEVEL_FIELD)?.toLowerCase();
  const timestamp = formatField(TIMESTAMP_FIELD);
  const message = formatField(MESSAGE_FIELD);

  return {
    level,
    timestamp,
    message,
  };
}

export const getFlyoutRenderFlags = (doc: FlyoutDoc) => {
  const hasTimestamp = Boolean(doc.timestamp);
  const hasLogLevel = Boolean(doc.level);
  const hasMessage = Boolean(doc.message);

  const hasBadges = hasTimestamp || hasLogLevel;

  const hasFlyoutHeader = hasBadges || hasMessage;

  return {
    hasTimestamp,
    hasLogLevel,
    hasMessage,
    hasBadges,
    hasFlyoutHeader,
  };
};
