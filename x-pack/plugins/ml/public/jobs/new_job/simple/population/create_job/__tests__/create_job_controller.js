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

describe('ML - Population Wizard - Create Job Controller', () => {
  beforeEach(() => {
    ngMock.module('kibana');
  });

  it('Initialize Create Job Controller', (done) => {
    sinon.stub(newJobUtils, 'createSearchItems').callsFake(() => ({
      indexPattern: {},
      savedSearch: {},
      combinedQuery: {}
    }));
    sinon.stub(indexUtils, 'timeBasedIndexCheck').callsFake(() => false);
    sinon.stub(utils, 'createFields').callsFake(() => false);
    ngMock.inject(function ($rootScope, $controller) {
      const scope = $rootScope.$new();
      $controller('MlCreatePopulationJob', { $scope: scope });

      expect(typeof scope.ui).to.eql('object');
      done();
    });
  });
});
