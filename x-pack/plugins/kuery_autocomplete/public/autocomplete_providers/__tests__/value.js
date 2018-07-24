/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import fetchMock from 'fetch-mock';
import { getSuggestionsProvider } from '../value';
import indexPatternResponse from 'ui/kuery/__tests__/index_pattern_response.json';

describe('Kuery value suggestions', function () {
  let config;
  let indexPatterns;
  let getSuggestions;

  const mockValues = ['foo', 'bar'];
  const fetchUrlMatcher = /\/api\/kibana\/suggestions\/values\/*/;

  beforeEach(() => fetchMock.post(fetchUrlMatcher, mockValues));
  afterEach(() => fetchMock.restore());

  describe('with config setting turned off', () => {
    beforeEach(() => {
      config = getConfigStub(false);
      indexPatterns = [indexPatternResponse];
      getSuggestions = getSuggestionsProvider({ config, indexPatterns });
    });

    it('should return a function', function () {
      expect(typeof getSuggestions).to.be('function');
    });

    it('should not make a request for suggestions', async () => {
      const fieldName = 'machine.os.raw';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(fetchMock.called(fetchUrlMatcher)).to.be(false);
      expect(suggestions).to.eql([]);
    });
  });

  describe('with config setting turned on', () => {
    beforeEach(() => {
      config = getConfigStub(true);
      indexPatterns = [indexPatternResponse];
      getSuggestions = getSuggestionsProvider({ config, indexPatterns });
    });

    it('should return a function', function () {
      expect(typeof getSuggestions).to.be('function');
    });

    it('should return boolean suggestions for boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).to.eql(['true ', 'false ']);
    });

    it('should filter boolean suggestions for boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = 'fa';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).to.eql(['false ']);
    });

    it('should not make a request for non-aggregatable fields', async () => {
      const fieldName = 'non-sortable';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(fetchMock.called(fetchUrlMatcher)).to.be(false);
      expect(suggestions).to.eql([]);
    });

    it('should not make a request for non-string fields', async () => {
      const fieldName = 'bytes';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(fetchMock.called(fetchUrlMatcher)).to.be(false);
      expect(suggestions).to.eql([]);
    });

    it('should make a request for string fields', async () => {
      const fieldName = 'machine.os.raw';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });

      const lastCall = fetchMock.lastCall(fetchUrlMatcher, 'POST');
      expect(lastCall[0]).to.eql('/api/kibana/suggestions/values/logstash-*');
      expect(lastCall[1]).to.eql({
        method: 'POST',
        body: '{"query":"","field":"machine.os.raw"}',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'kbn-version': '1.2.3',
        },
      });
      expect(suggestions.map(({ text }) => text)).to.eql(['"foo" ', '"bar" ']);
    });

    it('should not have descriptions', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.length).to.be.greaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.description).to.not.be.ok();
      });
    });
  });
});

function getConfigStub(suggestValues) {
  const get = sinon.stub().returns(suggestValues);
  return { get };
}
