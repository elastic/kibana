/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, core } from '../../test/test_utils';
import { ElasticsearchOverview as Overview } from './overview';

describe('<Overview />', () => {
  beforeEach(() => {
    core.http.fetch.mockResolvedValueOnce({ apiKeys: [] });
  });

  test('renders without throwing an error', () => {
    const wrapper = render(<Overview />);
    expect(wrapper).toBeDefined();
  });

  test('getting started', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Get started with Elasticsearch' })).toBeDefined();
  });

  test('select client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Select your client' })).toBeDefined();
  });
  test('install client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Install a client' })).toBeDefined();
  });
  test('api key', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Store your API key and Cloud ID' })).toBeDefined();
  });
  test('configure client', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Configure your client' })).toBeDefined();
  });
  test('test connection', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Test your connection' })).toBeDefined();
  });
  test('ingest data', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Ingest data' })).toBeDefined();
  });
  test('build query', () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: 'Build your first search query' })).toBeDefined();
  });
  test("what's next?", () => {
    const { getByRole } = render(<Overview />);
    expect(getByRole('heading', { name: "What's next?" })).toBeDefined();
  });
});
