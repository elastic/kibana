/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Observable } from 'rxjs';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ILicense } from '../../../licensing/public';
import { ReportingAPIClient } from '../lib/reporting_api_client';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

import { ReportListing } from './report_listing';

const reportingAPIClient = {
  list: () =>
    Promise.resolve([
      { _id: 'k90e51pk1ieucbae0c3t8wo2', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 0, browser_type: 'chromium', created_at: '2020-04-14T21:01:13.064Z', created_by: 'elastic', jobtype: 'printable_pdf', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T21:01:13.062Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '1970-01-01T00:00:00.000Z', status: 'pending', timeout: 300000, }, sort: [1586898073064], }, // prettier-ignore
      { _id: 'k90e51pk1ieucbae0c3t8wo1', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', created_at: '2020-04-14T21:01:13.064Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T21:01:13.062Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T21:06:14.526Z', started_at: '2020-04-14T21:01:14.526Z', status: 'processing', timeout: 300000, }, sort: [1586898073064], },
      { _id: 'k90cmthd1gv8cbae0c2le8bo', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T20:19:14.748Z', created_at: '2020-04-14T20:19:02.977Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 80262, }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T20:19:02.976Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T20:24:04.073Z', started_at: '2020-04-14T20:19:04.073Z', status: 'completed', timeout: 300000, }, sort: [1586895542977], },
      { _id: 'k906958e1d4wcbae0c9hip1a', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:21:08.223Z', created_at: '2020-04-14T17:20:27.326Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 49468, warnings: [ 'An error occurred when trying to read the page for visualization panel info. You may need to increase \'xpack.reporting.capture.timeouts.waitForElements\'. TimeoutError: waiting for selector "[data-shared-item],[data-shared-items-count]" failed: timeout 30000ms exceeded', ], }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T17:20:27.326Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e8-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T17:25:29.444Z', started_at: '2020-04-14T17:20:29.444Z', status: 'completed_with_warnings', timeout: 300000, }, sort: [1586884827326], },
      { _id: 'k9067y2a1d4wcbae0cad38n0', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:19:53.244Z', created_at: '2020-04-14T17:19:31.379Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 80262, }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T17:19:31.378Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T17:24:39.883Z', started_at: '2020-04-14T17:19:39.883Z', status: 'completed', timeout: 300000, }, sort: [1586884771379], },
      { _id: 'k9067s1m1d4wcbae0cdnvcms', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:19:36.822Z', created_at: '2020-04-14T17:19:23.578Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 80262, }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T17:19:23.578Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T17:24:25.247Z', started_at: '2020-04-14T17:19:25.247Z', status: 'completed', timeout: 300000, }, sort: [1586884763578], },
      { _id: 'k9065q3s1d4wcbae0c00fxlh', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:18:03.910Z', created_at: '2020-04-14T17:17:47.752Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 80262, }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T17:17:47.750Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T17:22:50.379Z', started_at: '2020-04-14T17:17:50.379Z', status: 'completed', timeout: 300000, }, sort: [1586884667752], },
      { _id: 'k905zdw11d34cbae0c3y6tzh', _index: '.reporting-2020.04.12', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-14T17:13:03.719Z', created_at: '2020-04-14T17:12:51.985Z', created_by: 'elastic', jobtype: 'printable_pdf', kibana_id: '5b2de169-2785-441b-ae8c-186a1936b17d', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'preserve_layout', objectType: 'canvas workpad', }, output: { content_type: 'application/pdf', size: 80262, }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-14T17:12:51.984Z', layout: { dimensions: { height: 720, width: 1080, }, id: 'preserve_layout', }, objectType: 'canvas workpad', relativeUrls: [ '/s/hsyjklk/app/canvas#/export/workpad/pdf/workpad-53d38306-eda4-410f-b5e7-efbeca1a8c63/page/1', ], title: 'My Canvas Workpad', }, priority: 10, process_expiration: '2020-04-14T17:17:52.431Z', started_at: '2020-04-14T17:12:52.431Z', status: 'completed', timeout: 300000, }, sort: [1586884371985], },
      { _id: 'k8t4ylcb07mi9d006214ifyg', _index: '.reporting-2020.04.05', _score: null, _source: { attempts: 1, browser_type: 'chromium', completed_at: '2020-04-09T19:10:10.049Z', created_at: '2020-04-09T19:09:52.139Z', created_by: 'elastic', jobtype: 'PNG', kibana_id: 'f2e59b4e-f79b-4a48-8a7d-6d50a3c1d914', kibana_name: 'spicy.local', max_attempts: 1, meta: { layout: 'png', objectType: 'visualization', }, output: { content_type: 'image/png', }, payload: { basePath: '/kbn', browserTimezone: 'America/Phoenix', forceNow: '2020-04-09T19:09:52.137Z', layout: { dimensions: { height: 1575, width: 1423, }, id: 'png', }, objectType: 'visualization', relativeUrl: "/s/hsyjklk/app/visualize#/edit/94d1fe40-7a94-11ea-b373-0749f92ad295?_a=(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!((enabled:!t,id:'1',params:(),schema:metric,type:count)),params:(addLegend:!f,addTooltip:!t,metric:(colorSchema:'Green%20to%20Red',colorsRange:!((from:0,to:10000)),invertColors:!f,labels:(show:!t),metricColorMode:None,percentageMode:!f,style:(bgColor:!f,bgFill:%23000,fontSize:60,labelColor:!f,subText:''),useRanges:!f),type:metric),title:count,type:metric))&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15y,to:now))&indexPattern=d81752b0-7434-11ea-be36-1f978cda44d4&type=metric", title: 'count', }, priority: 10, process_expiration: '2020-04-09T19:14:54.570Z', started_at: '2020-04-09T19:09:54.570Z', status: 'completed', timeout: 300000, }, sort: [1586459392139], },
    ]), // prettier-ignore
  total: () => Promise.resolve(18),
} as any;

const validCheck = {
  check: () => ({
    state: 'VALID',
    message: '',
  }),
};

const license$ = {
  subscribe: (handler: any) => {
    return handler(validCheck);
  },
} as Observable<ILicense>;

const toasts = {
  addDanger: jest.fn(),
} as any;

const mockPollConfig = {
  jobCompletionNotifier: {
    interval: 5000,
    intervalErrorMultiplier: 3,
  },
  jobsRefresh: {
    interval: 5000,
    intervalErrorMultiplier: 3,
  },
};

describe('ReportListing', () => {
  it('Report job listing with some items', () => {
    const wrapper = mountWithIntl(
      <ReportListing
        apiClient={reportingAPIClient as ReportingAPIClient}
        license$={license$}
        pollConfig={mockPollConfig}
        redirect={jest.fn()}
        toasts={toasts}
      />
    );
    wrapper.update();
    const input = wrapper.find('[data-test-subj="reportJobListing"]');
    expect(input).toMatchSnapshot();
  });

  it('subscribes to license changes, and unsubscribes on dismount', () => {
    const unsubscribeMock = jest.fn();
    const subMock = {
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: unsubscribeMock,
      }),
    } as any;

    const wrapper = mountWithIntl(
      <ReportListing
        apiClient={reportingAPIClient as ReportingAPIClient}
        license$={subMock as Observable<ILicense>}
        pollConfig={mockPollConfig}
        redirect={jest.fn()}
        toasts={toasts}
      />
    );
    wrapper.update();
    expect(subMock.subscribe).toHaveBeenCalled();
    expect(unsubscribeMock).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
