/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import connectToDataSources from '../../images/connect_to_existing_sources.png';
import { ADD_INTEGRATIONS_IMAGE_TITLE } from '../../translations';
import { ContentWrapper } from './content_wrapper';

const AddIntegrationsImageComponent = () => {
  return (
    <ContentWrapper>
      <img
        src={connectToDataSources}
        alt={ADD_INTEGRATIONS_IMAGE_TITLE}
        height="100%"
        width="100%"
      />
    </ContentWrapper>
  );
};

export const AddIntegrationsImage = React.memo(AddIntegrationsImageComponent);
