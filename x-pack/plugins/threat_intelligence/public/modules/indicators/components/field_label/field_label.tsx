/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { i18n } from '@kbn/i18n';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';

interface IndicatorFieldLabelProps {
  field: string;
}

/**
 * Renders field label using i18n, or the field key if the translation is not available
 */
export const IndicatorFieldLabel: VFC<IndicatorFieldLabelProps> = ({ field }) => (
  <>{translateFieldLabel(field)}</>
);

/** This translates the field name using kbn-i18n */
export const translateFieldLabel = (field: string) => {
  // This switch is necessary as i18n id cannot be dynamic, see:
  // https://github.com/elastic/kibana/blob/main/src/dev/i18n/README.md
  switch (field) {
    case RawIndicatorFieldId.TimeStamp: {
      return i18n.translate('xpack.threatIntelligence.field.@timestamp', {
        defaultMessage: '@timestamp',
      });
    }
    case RawIndicatorFieldId.Name: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.name', {
        defaultMessage: 'Indicator',
      });
    }
    case RawIndicatorFieldId.Type: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.type', {
        defaultMessage: 'Indicator type',
      });
    }
    case RawIndicatorFieldId.Feed: {
      return i18n.translate('xpack.threatIntelligence.field.threat.feed.name', {
        defaultMessage: 'Feed',
      });
    }
    case RawIndicatorFieldId.FirstSeen: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.first_seen', {
        defaultMessage: 'First seen',
      });
    }
    case RawIndicatorFieldId.LastSeen: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.last_seen', {
        defaultMessage: 'Last seen',
      });
    }
    case RawIndicatorFieldId.Confidence: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.confidence', {
        defaultMessage: 'Confidence',
      });
    }
    case RawIndicatorFieldId.MarkingTLP: {
      return i18n.translate('xpack.threatIntelligence.field.threat.indicator.marking.tlp', {
        defaultMessage: 'TLP Marking',
      });
    }
    default:
      return field;
  }
};
