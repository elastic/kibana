/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TagsManagementServices } from '../../services';
import { Provider } from '../../context';
import { Section } from './section';

export interface Props {
  services: TagsManagementServices;
}

export const TagsManagementSection: React.FC<Props> = ({ services }) => {
  // React.useEffect(() => {
  //   services.params.attachments.client.create({
  //     attachment: {
  //       tagId: 'ae3e17c0-bb89-11ea-8738-cdb6f2af187d',
  //       kid: 'kid:core:saved_object/workpad-ad72a4e9-b422-480c-be6d-a64a0b79541d',
  //     },
  //   });
  // }, [services]);

  return (
    <Provider services={services}>
      <Section />
    </Provider>
  );
};
