/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { Assign } from '@kbn/utility-types';
import { DateFormatArgInput, Props as ComponentProps } from './date_format';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentFactory } from '../../../../types/arguments';
import { ArgumentStrings } from '../../../../i18n';

import { SetupInitializer } from '../../../plugin';

const { DateFormat: strings } = ArgumentStrings;

const getDateFormatArgInput =
  (defaultDateFormats: ComponentProps['dateFormats']) =>
  (props: Assign<ComponentProps, { dateFormats?: ComponentProps['dateFormats'] }>) => (
    <DateFormatArgInput dateFormats={defaultDateFormats} {...props} />
  );

export const dateFormatInitializer: SetupInitializer<ArgumentFactory<ComponentProps>> = (
  core,
  plugins
) => {
  const formatMap = {
    DEFAULT: core.uiSettings.get('dateFormat'),
    NANOS: core.uiSettings.get('dateNanosFormat'),
    ISO8601: '',
    LOCAL_LONG: 'LLLL',
    LOCAL_SHORT: 'LLL',
    LOCAL_DATE: 'l',
    LOCAL_TIME_WITH_SECONDS: 'LTS',
  };

  const dateFormats = Object.values(formatMap).map((format) => ({
    value: format,
    text: moment.utc(moment()).format(format),
  }));

  return () => ({
    name: 'dateFormat',
    displayName: strings.getDisplayName(),
    help: strings.getHelp(),
    simpleTemplate: templateFromReactComponent(getDateFormatArgInput(dateFormats)),
  });
};
