/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MentionsParserConfig } from "./types";


const userOptions = [
    {
      label: 'js-jankisalvi',
      data: { firstName: 'Janki', lastName: 'Salvi' },
    },
    {
      label: 'cnasikas',
      data: { firstName: 'Christos', lastName: 'Nasikas' },
    },
    { label: 'adcoelho', data: { firstName: 'Antonio', lastName: 'Coelho' } },
    { label: 'jonathan-buttner', data: { firstName: 'Jonathan', lastName: 'Buttner' } },
    { label: 'guskovaue', data: { firstName: 'Julia', lastName: 'Guskova' } },
    {
      label: 'doakalexi',
      data: { firstName: 'Alexi', lastName: 'Doak' },
    },
    { label: 'ymao1', data: { firstName: 'Ying', lastName: 'Mao' } },
    { label: 'jdoe', data: { firstName: 'Doe', lastName: 'John' } },
  ];

  export const mentionsConfig: MentionsParserConfig = {
    options: userOptions,
  };
