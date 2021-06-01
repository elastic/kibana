/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import {
  getContentSourcePath,
  getGroupPath,
  getGroupSourcePrioritizationPath,
  getReindexJobRoute,
  getSourcesPath,
  GROUPS_PATH,
  SOURCES_PATH,
  PERSONAL_SOURCES_PATH,
  SOURCE_DETAILS_PATH,
} from './routes';

const TestComponent = ({ id, isOrg }: { id: string; isOrg?: boolean }) => {
  const href = getContentSourcePath(SOURCE_DETAILS_PATH, id, !!isOrg);
  return <EuiLink href={href}>test</EuiLink>;
};

describe('getContentSourcePath', () => {
  it('should format org path', () => {
    const wrapper = shallow(<TestComponent id="123" isOrg />);
    const path = wrapper.find(EuiLink).prop('href');

    expect(path).toEqual(`${SOURCES_PATH}/123`);
  });

  it('should format user path', () => {
    const wrapper = shallow(<TestComponent id="123" />);
    const path = wrapper.find(EuiLink).prop('href');

    expect(path).toEqual(`${PERSONAL_SOURCES_PATH}/123`);
  });
});

describe('getGroupPath', () => {
  it('should format path', () => {
    expect(getGroupPath('123')).toEqual(`${GROUPS_PATH}/123`);
  });
});

describe('getGroupSourcePrioritizationPath', () => {
  it('should format path', () => {
    expect(getGroupSourcePrioritizationPath('123')).toEqual(
      `${GROUPS_PATH}/123/source_prioritization`
    );
  });
});

describe('getSourcesPath', () => {
  const PATH = '/foo/123';

  it('should format org path', () => {
    expect(getSourcesPath(PATH, true)).toEqual(PATH);
  });

  it('should format user path', () => {
    expect(getSourcesPath(PATH, false)).toEqual(`/p${PATH}`);
  });
});

describe('getReindexJobRoute', () => {
  const SOURCE_ID = '234';
  const REINDEX_ID = '345';

  it('should format org path', () => {
    expect(getReindexJobRoute(SOURCE_ID, REINDEX_ID, true)).toEqual(
      `/sources/${SOURCE_ID}/schema_errors/${REINDEX_ID}`
    );
  });

  it('should format user path', () => {
    expect(getReindexJobRoute(SOURCE_ID, REINDEX_ID, false)).toEqual(
      `/p/sources/${SOURCE_ID}/schema_errors/${REINDEX_ID}`
    );
  });
});
