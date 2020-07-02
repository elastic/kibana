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
  //         tagId: '821e9250-bc3d-11ea-ad31-378b8af727f3',
  //         kid: 'kid::data:ip:index_pattern/123',
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
