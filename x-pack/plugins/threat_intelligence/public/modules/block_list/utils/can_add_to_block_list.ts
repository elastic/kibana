/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';
import { getIndicatorFieldAndValue } from '../../indicators/utils/field_value';

/**
 * Checks if an indicator has sha256, sha1 or md5 (in that order) and returns an empty string if it does not.
 * The value is returned to be used in the add to block list logic.
 *
 * @param indicator the indicator we want to
 */
export const canAddToBlockList = (indicator: Indicator): string | null => {
  const sha256: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.FileSha256
  ).value;
  if (sha256 != null) {
    return sha256;
  }

  const sha1: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.FileSha1
  ).value;
  if (sha1 != null) {
    return sha1;
  }

  const md5: string | null = getIndicatorFieldAndValue(
    indicator,
    RawIndicatorFieldId.FileMd5
  ).value;
  if (md5 != null) {
    return md5;
  }

  return null;
};
