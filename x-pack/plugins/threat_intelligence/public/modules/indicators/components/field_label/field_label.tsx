/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  CONFIDENCE,
  FEED,
  FIRST_SEEN,
  LAST_SEEN,
  MARKING_TLP,
  NAME,
  TIMESTAMP,
  TYPE,
} from './translations';
import { RawIndicatorFieldId } from '../../types/indicator';

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
      return TIMESTAMP;
    }
    case RawIndicatorFieldId.Name: {
      return NAME;
    }
    case RawIndicatorFieldId.Type: {
      return TYPE;
    }
    case RawIndicatorFieldId.Feed: {
      return FEED;
    }
    case RawIndicatorFieldId.FirstSeen: {
      return FIRST_SEEN;
    }
    case RawIndicatorFieldId.LastSeen: {
      return LAST_SEEN;
    }
    case RawIndicatorFieldId.Confidence: {
      return CONFIDENCE;
    }
    case RawIndicatorFieldId.MarkingTLP: {
      return MARKING_TLP;
    }
    default:
      return field;
  }
};
