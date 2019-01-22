/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const HOSTS = i18n.translate('xpack.secops.uncommonProcessTable.hosts', {
  defaultMessage: 'Hosts',
});

export const NUMBER_OF_HOSTS = i18n.translate('xpack.secops.uncommonProcessTable.numberOfHosts', {
  defaultMessage: 'Number of Hosts',
});

export const NUMBER_OF_INSTANCES = i18n.translate(
  'xpack.secops.uncommonProcessTable.numberOfInstances',
  {
    defaultMessage: 'Number of Instances',
  }
);

export const COMMAND_LINE = i18n.translate('xpack.secops.uncommonProcessTable.commandLine', {
  defaultMessage: 'Command Line',
});

export const USER = i18n.translate('xpack.secops.uncommonProcessTable.user', {
  defaultMessage: 'User',
});

export const NAME = i18n.translate('xpack.secops.uncommonProcessTable.name', {
  defaultMessage: 'Name',
});

export const UNCOMMON_PROCESSES = i18n.translate(
  'xpack.secops.authenticationsTable.uncommonProcessTable',
  {
    defaultMessage: 'Uncommon Processes',
  }
);

export const ROWS_5 = i18n.translate('xpack.secops.uncommonProcessTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.secops.uncommonProcessTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_20 = i18n.translate('xpack.secops.uncommonProcessTable.rows', {
  values: { numRows: 20 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_50 = i18n.translate('xpack.secops.uncommonProcessTable.rows', {
  values: { numRows: 50 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
