/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractDefaultDynamicKafkaTopics,
  extractDefaultStaticKafkaTopic,
} from './use_output_form';

describe('use_output_form', () => {
  describe('extractDefaultDynamicKafkaTopics', () => {
    it('should return empty array if not topics are passed', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual([]);
    });

    it('should return empty array if topics have length == 0', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [],
      });

      expect(res).toEqual([]);
    });

    it('should return empty array if topics do not include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: 'something' }],
      });

      expect(res).toEqual([]);
    });

    it('should return options for combobox if topics include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: '%{[default.dataset]}' }],
      });

      expect(res).toEqual([
        {
          label: 'default.dataset',
          value: 'default.dataset',
        },
      ]);
    });

    it('should return options for combobox if topics include %{[ and some special characters', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: '%{[@timestamp]}' }],
      });

      expect(res).toEqual([
        {
          label: '@timestamp',
          value: '@timestamp',
        },
      ]);
    });

    it('should return options for combobox if topics include %{[ and a custom name', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: '%{[something]}' }],
      });

      expect(res).toEqual([
        {
          label: 'something',
          value: 'something',
        },
      ]);
    });
  });

  describe('extractDefaultStaticKafkaTopic', () => {
    it('should return empty array if not topics are passed', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual('');
    });

    it('should return empty array if topics have length == 0', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [],
      });

      expect(res).toEqual('');
    });

    it('should return empty string if topics include %{[', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: '%{[something]}' }],
      });

      expect(res).toEqual('');
    });

    it('should return the topic if topics field is defined', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: 'something' }],
      });

      expect(res).toEqual('something');
    });

    it('should return the last topic if topics field is defined and has multiple', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topics: [{ topic: 'something_1' }, { topic: 'something_2' }, { topic: 'something_3' }],
      });

      expect(res).toEqual('something_3');
    });
  });
});
