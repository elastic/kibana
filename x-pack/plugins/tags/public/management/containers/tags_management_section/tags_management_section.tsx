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
  //   services.params.tags.attachments.create({
  //     attachments: [
  //       {
  //         tagId: 'a5cf7800-bd1d-11ea-b218-3176b6a06bb5',
  //         kid: 'kid:::so:saved_object/dashboard/722b74f0-b882-11e8-a6d9-e546fe2bba5f',
  //       },
  //     ],
  //   });
  // }, [services]);

  return (
    <Provider services={services}>
      <Section />
    </Provider>
  );
};
