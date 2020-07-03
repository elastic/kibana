/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EuiButton } from '@elastic/eui';
import { Page } from '../page';
import { TagTable } from '../tag_table';
import { txtTitle, txtSubtitle, txtCreateATag } from './i18n';
import { useServices } from '../../context';
import { Empty } from './empty';

const callToAction = (
  <Link to={'/create'}>
    <EuiButton iconType="plusInCircle" fill>
      {txtCreateATag}
    </EuiButton>
  </Link>
);

export const LandingPage: React.FC = () => {
  const { manager } = useServices();
  const initializing = manager.useInitializing();
  const tagMap = manager.useTags();
  const tags = useMemo(() => Object.values(tagMap).map(({ data }) => data), [tagMap]);

  return (
    <Page
      id={'TagTable'}
      title={txtTitle}
      subtitle={tags.length ? <p>{txtSubtitle}</p> : undefined}
      callToAction={tags.length ? callToAction : undefined}
    >
      {!initializing && !!tags.length && <TagTable />}
      {!initializing && !tags.length && <Empty />}
    </Page>
  );
};
