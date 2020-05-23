/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { executeActions, getUiMessage } from './cluster_state.lib';
import { AlertClusterStateState } from '../../alerts/enums';
import { AlertCommonPerClusterMessageLinkToken } from '../../alerts/types';

describe('clusterState lib', () => {
  describe('executeActions', () => {
    const clusterName = 'clusterA';
    const instance: any = { scheduleActions: jest.fn() };
    const license: any = { clusterName };
    const status = AlertClusterStateState.Green;
    const emailAddress = 'test@test.com';

    beforeEach(() => {
      instance.scheduleActions.mockClear();
    });

    it('should schedule actions when firing', () => {
      executeActions(instance, license, status, emailAddress, false);
      expect(instance.scheduleActions).toHaveBeenCalledWith('default', {
        subject: 'NEW X-Pack Monitoring: Cluster Status',
        message: `Allocate missing replica shards for cluster '${clusterName}'`,
        to: emailAddress,
      });
    });

    it('should have a different message for red state', () => {
      executeActions(instance, license, AlertClusterStateState.Red, emailAddress, false);
      expect(instance.scheduleActions).toHaveBeenCalledWith('default', {
        subject: 'NEW X-Pack Monitoring: Cluster Status',
        message: `Allocate missing primary and replica shards for cluster '${clusterName}'`,
        to: emailAddress,
      });
    });

    it('should schedule actions when resolved', () => {
      executeActions(instance, license, status, emailAddress, true);
      expect(instance.scheduleActions).toHaveBeenCalledWith('default', {
        subject: 'RESOLVED X-Pack Monitoring: Cluster Status',
        message: `This cluster alert has been resolved: Allocate missing replica shards for cluster '${clusterName}'`,
        to: emailAddress,
      });
    });
  });

  describe('getUiMessage', () => {
    it('should return a message when firing', () => {
      const message = getUiMessage(AlertClusterStateState.Red, false);
      expect(message.text).toBe(
        `Elasticsearch cluster status is red. #start_linkAllocate missing primary and replica shards#end_link`
      );
      expect(message.tokens && message.tokens.length).toBe(1);
      expect(message.tokens && message.tokens[0].startToken).toBe('#start_link');
      expect(message.tokens && message.tokens[0].endToken).toBe('#end_link');
      expect(
        message.tokens && (message.tokens[0] as AlertCommonPerClusterMessageLinkToken).url
      ).toBe('elasticsearch/indices');
    });

    it('should return a message when resolved', () => {
      const message = getUiMessage(AlertClusterStateState.Green, true);
      expect(message.text).toBe(`Elasticsearch cluster status is green.`);
      expect(message.tokens).not.toBeDefined();
    });
  });
});
