/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import {
  ABSOLUTE_MAX_FILE_SIZE_BYTES,
  FILE_SIZE_DISPLAY_FORMAT,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BYTES,
  UI_SETTING_MAX_FILE_SIZE,
} from '../../common/constants';
import { getUiSettings } from '../kibana_services';

export function getMaxBytes() {
  const maxFileSize = getUiSettings().get(UI_SETTING_MAX_FILE_SIZE, MAX_FILE_SIZE);
  // @ts-ignore
  const maxBytes = numeral(maxFileSize.toUpperCase()).value();
  if (maxBytes < MAX_FILE_SIZE_BYTES) {
    return MAX_FILE_SIZE_BYTES;
  }
  return maxBytes <= ABSOLUTE_MAX_FILE_SIZE_BYTES ? maxBytes : ABSOLUTE_MAX_FILE_SIZE_BYTES;
}

export function getMaxBytesFormatted() {
  return numeral(getMaxBytes()).format(FILE_SIZE_DISPLAY_FORMAT);
}
