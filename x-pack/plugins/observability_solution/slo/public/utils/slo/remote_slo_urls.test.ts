/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSlo } from '../../data/slo/slo';
import {
  createRemoteSloCloneUrl,
  createRemoteSloDeleteUrl,
  createRemoteSloDetailsUrl,
  createRemoteSloEditUrl,
} from './remote_slo_urls';

describe('remote SLO URLs Utils', () => {
  it('returns undefined for local SLOs', () => {
    const localSlo = buildSlo({ id: 'fixed-id' });

    expect(createRemoteSloDetailsUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDeleteUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEditUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloCloneUrl(localSlo)).toMatchInlineSnapshot(`undefined`);
  });

  it('returns undefined for remote SLOs with empty kibanaUrl', () => {
    const remoteSloWithoutKibanaUrl = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: '', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloDeleteUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloEditUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
    expect(createRemoteSloCloneUrl(remoteSloWithoutKibanaUrl)).toMatchInlineSnapshot(`undefined`);
  });

  it('returns the correct URLs for remote SLOs with kibanaUrl', () => {
    const remoteSlo = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: 'https://cloud.elast.co/kibana', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?"`
    );
    expect(createRemoteSloDeleteUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/fixed-id?delete=true"`
    );
    expect(createRemoteSloEditUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/edit/fixed-id"`
    );
    expect(createRemoteSloCloneUrl(remoteSlo)).toMatchInlineSnapshot(
      `"https://cloud.elast.co/app/slos/create?_a=(budgetingMethod:occurrences,createdAt:%272022-12-29T10:11:12.000Z%27,description:%27some%20description%20useful%27,enabled:!t,groupBy:%27*%27,groupings:(),indicator:(params:(filter:%27baz:%20foo%20and%20bar%20%3E%202%27,good:%27http_status:%202xx%27,index:some-index,timestampField:custom_timestamp,total:%27a%20query%27),type:sli.kql.custom),instanceId:%27*%27,meta:(),name:%27[Copy]%20super%20important%20level%20service%27,objective:(target:0.98),remote:(kibanaUrl:%27https:/cloud.elast.co/kibana%27,remoteName:remote_cluster),revision:1,settings:(frequency:%271m%27,preventInitialBackfill:!f,syncDelay:%271m%27),summary:(errorBudget:(consumed:0.064,initial:0.02,isEstimated:!f,remaining:0.936),sliValue:0.99872,status:HEALTHY),tags:!(k8s,production,critical),timeWindow:(duration:%2730d%27,type:rolling),updatedAt:%272022-12-29T10:11:12.000Z%27,version:2)"`
    );
  });

  it('returns the correct URLs including spaceId for remote SLOs with kibanaUrl', () => {
    const remoteSlo = buildSlo({
      id: 'fixed-id',
      remote: { kibanaUrl: 'https://cloud.elast.co/kibana', remoteName: 'remote_cluster' },
    });

    expect(createRemoteSloDetailsUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?"`
    );
    expect(createRemoteSloDeleteUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/fixed-id?delete=true"`
    );
    expect(createRemoteSloEditUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/edit/fixed-id"`
    );
    expect(createRemoteSloCloneUrl(remoteSlo, 'my-custom-space')).toMatchInlineSnapshot(
      `"https://cloud.elast.co/s/my-custom-space/app/slos/create?_a=(budgetingMethod:occurrences,createdAt:%272022-12-29T10:11:12.000Z%27,description:%27some%20description%20useful%27,enabled:!t,groupBy:%27*%27,groupings:(),indicator:(params:(filter:%27baz:%20foo%20and%20bar%20%3E%202%27,good:%27http_status:%202xx%27,index:some-index,timestampField:custom_timestamp,total:%27a%20query%27),type:sli.kql.custom),instanceId:%27*%27,meta:(),name:%27[Copy]%20super%20important%20level%20service%27,objective:(target:0.98),remote:(kibanaUrl:%27https:/cloud.elast.co/kibana%27,remoteName:remote_cluster),revision:1,settings:(frequency:%271m%27,preventInitialBackfill:!f,syncDelay:%271m%27),summary:(errorBudget:(consumed:0.064,initial:0.02,isEstimated:!f,remaining:0.936),sliValue:0.99872,status:HEALTHY),tags:!(k8s,production,critical),timeWindow:(duration:%2730d%27,type:rolling),updatedAt:%272022-12-29T10:11:12.000Z%27,version:2)"`
    );
  });
});
