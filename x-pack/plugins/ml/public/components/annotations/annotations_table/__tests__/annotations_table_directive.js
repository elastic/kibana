/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import jobConfig from '../../../../../common/types/__mocks__/job_config_farequote';

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';

import { ml } from '../../../../services/ml_api_service';

describe('ML - <ml-annotation-table>', () => {
  let $scope;
  let $compile;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    ngMock.inject(function ($injector) {
      $compile = $injector.get('$compile');
      const $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    });
  });

  afterEach(() => {
    $scope.$destroy();
  });

  it('Plain initialization doesn\'t throw an error', () => {
    expect(() => {
      $compile('<ml-annotation-table />')($scope);
    }).to.not.throwError();
  });

  it('Initialization with empty annotations array doesn\'t throw an error', () => {
    expect(() => {
      $compile('<ml-annotation-table annotations="[]" />')($scope);
    }).to.not.throwError();
  });

  it('Initialization with job config doesn\'t throw an error', () => {
    const getAnnotationsStub = sinon.stub(ml.annotations, 'getAnnotations').resolves({ annotations: [] });

    expect(() => {
      $scope.jobs = [jobConfig];
      $compile('<ml-annotation-table jobs="jobs" />')($scope);
    }).to.not.throwError();

    getAnnotationsStub.restore();
  });

});
