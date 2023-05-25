/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetLinkProps } from '../use_link_props';

export const getLinkProps = jest.fn(() => ({
  href: '/test-href',
  onClick: jest.fn(),
}));

export const useLinkProps: GetLinkProps = getLinkProps;
export const useGetLinkProps: () => GetLinkProps = jest.fn(() => getLinkProps);
