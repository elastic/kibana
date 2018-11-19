/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

// Import this way to be able to stub/mock functions later on in the tests using sinon.
import * as newJobUtils from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import * as indexUtils from 'plugins/ml/util/index_utils';
import * as utils from 'plugins/ml/jobs/new_job/simple/components/utils/create_fields';

describe('ML - Multi Metric Wizard - Create Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Job Controller', (done) => {
    const stub1 = sinon.stub(newJobUtils, 'createSearchItems').callsFake(() => ({
      indexPattern: {},
      savedSearch: {},
      combinedQuery: {}
    }));
    const stub2 = sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    const stub3 = sinon.stub(utils, 'createFields').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();
      $controller('MlCreateMultiMetricJob', { $scope: scope });

      expect(typeof scope.ui).to.eql('object');
      stub1.restore();
      stub2.restore();
      stub3.restore();
      done();
    });
  });
});
