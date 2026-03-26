/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getAgentSyncValue } from './helper';

describe('getAgentSyncValue', () => {
  describe('Elastic agents - sync agents (true)', () => {
    it('returns true for nodejs', () => {
      expect(getAgentSyncValue('nodejs')).toBe(true);
    });

    it('returns true for js-base', () => {
      expect(getAgentSyncValue('js-base')).toBe(true);
    });

    it('returns true for rum-js', () => {
      expect(getAgentSyncValue('rum-js')).toBe(true);
    });
  });

  describe('Elastic agents - async agents (false)', () => {
    it('returns false for php', () => {
      expect(getAgentSyncValue('php')).toBe(false);
    });

    it('returns false for python', () => {
      expect(getAgentSyncValue('python')).toBe(false);
    });

    it('returns false for dotnet', () => {
      expect(getAgentSyncValue('dotnet')).toBe(false);
    });

    it('returns false for iOS/swift', () => {
      expect(getAgentSyncValue('iOS/swift')).toBe(false);
    });

    it('returns false for ruby', () => {
      expect(getAgentSyncValue('ruby')).toBe(false);
    });

    it('returns false for java', () => {
      expect(getAgentSyncValue('java')).toBe(false);
    });

    it('returns false for go', () => {
      expect(getAgentSyncValue('go')).toBe(false);
    });

    it('returns false for android/java', () => {
      expect(getAgentSyncValue('android/java')).toBe(false);
    });
  });

  describe('OpenTelemetry agents - sync languages', () => {
    it('returns true for opentelemetry/nodejs', () => {
      expect(getAgentSyncValue('opentelemetry/nodejs')).toBe(true);
    });

    it('returns true for opentelemetry/webjs', () => {
      expect(getAgentSyncValue('opentelemetry/webjs')).toBe(true);
    });

    it('returns true for otlp/nodejs', () => {
      expect(getAgentSyncValue('otlp/nodejs')).toBe(true);
    });

    it('returns true for otlp/webjs', () => {
      expect(getAgentSyncValue('otlp/webjs')).toBe(true);
    });
  });

  describe('OpenTelemetry agents - async languages', () => {
    it('returns false for opentelemetry/java', () => {
      expect(getAgentSyncValue('opentelemetry/java')).toBe(false);
    });

    it('returns false for opentelemetry/python', () => {
      expect(getAgentSyncValue('opentelemetry/python')).toBe(false);
    });

    it('returns false for opentelemetry/go', () => {
      expect(getAgentSyncValue('opentelemetry/go')).toBe(false);
    });

    it('returns false for opentelemetry/php', () => {
      expect(getAgentSyncValue('opentelemetry/php')).toBe(false);
    });

    it('returns false for opentelemetry/dotnet', () => {
      expect(getAgentSyncValue('opentelemetry/dotnet')).toBe(false);
    });

    it('returns false for opentelemetry/ruby', () => {
      expect(getAgentSyncValue('opentelemetry/ruby')).toBe(false);
    });

    it('returns false for opentelemetry/cpp', () => {
      expect(getAgentSyncValue('opentelemetry/cpp')).toBe(false);
    });

    it('returns false for opentelemetry/rust', () => {
      expect(getAgentSyncValue('opentelemetry/rust')).toBe(false);
    });

    it('returns false for opentelemetry/swift', () => {
      expect(getAgentSyncValue('opentelemetry/swift')).toBe(false);
    });

    it('returns false for opentelemetry/android', () => {
      expect(getAgentSyncValue('opentelemetry/android')).toBe(false);
    });

    it('returns false for opentelemetry/erlang', () => {
      expect(getAgentSyncValue('opentelemetry/erlang')).toBe(false);
    });

    it('returns false for otlp/java', () => {
      expect(getAgentSyncValue('otlp/java')).toBe(false);
    });

    it('returns false for otlp/python', () => {
      expect(getAgentSyncValue('otlp/python')).toBe(false);
    });
  });

  describe('EDOT agents', () => {
    it('returns false for opentelemetry/java/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/java/elastic')).toBe(false);
    });

    it('returns true for opentelemetry/nodejs/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/nodejs/elastic')).toBe(true);
    });

    it('returns false for opentelemetry/python/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/python/elastic')).toBe(false);
    });

    it('returns false for opentelemetry/php/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/php/elastic')).toBe(false);
    });

    it('returns false for opentelemetry/dotnet/elastic', () => {
      expect(getAgentSyncValue('opentelemetry/dotnet/elastic')).toBe(false);
    });
  });

  describe('Unsupported agents return undefined', () => {
    it('returns undefined for base opentelemetry without language', () => {
      expect(getAgentSyncValue('opentelemetry')).toBeUndefined();
    });

    it('returns undefined for base otlp without language', () => {
      expect(getAgentSyncValue('otlp')).toBeUndefined();
    });
  });
});
