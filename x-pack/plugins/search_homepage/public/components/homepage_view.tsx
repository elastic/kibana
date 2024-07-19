/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { useKibana } from '../hooks/use_kibana';
import { SearchHomepageBody } from './search_homepage_body';
import { SearchHomepageHeader } from './search_homepage_header';
import { CreateIndexModal } from './create_index_modal';

export interface HomepageViewProps {
  showEndpointsAPIKeys?: boolean;
}
export const HomepageView = ({ showEndpointsAPIKeys = false }: HomepageViewProps) => {
  const { application, share } = useKibana().services;
  const [createIndexModalOpen, setCreateIndexModalOpen] = useState<boolean>(false);
  const onCreateIndex = useCallback(async () => {
    const createIndexLocator = share?.url.locators.get('CREATE_INDEX_LOCATOR_ID');
    if (createIndexLocator) {
      const createIndexUrl = await createIndexLocator.getUrl({});
      application.navigateToUrl(createIndexUrl);
    } else {
      setCreateIndexModalOpen(true);
    }
  }, [application, share]);

  return (
    <>
      <SearchHomepageHeader
        onCreateIndex={onCreateIndex}
        showEndpointsAPIKeys={showEndpointsAPIKeys}
      />
      <SearchHomepageBody onCreateIndex={onCreateIndex} />
      {createIndexModalOpen && (
        <CreateIndexModal closeModal={() => setCreateIndexModalOpen(false)} />
      )}
    </>
  );
};
