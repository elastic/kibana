/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Class for handling model updates of an Angular controller
 * Some properties are simple primitives like strings or booleans,
 * but sometimes we need a property in the model to be an Array. For example,
 * there may be multiple errors that happen in a flow.
 *
 * I use 1 method to handling property values that are either primitives or
 * arrays, because it allows the callers to be a little more dumb. All they
 * have to know is the property name, rather than the type as well.
 */
export class ModelUpdater {
  constructor($scope, model) {
    this.$scope = $scope;
    this.model = model;
    this.updateModel = this.updateModel.bind(this);
  }

  updateModel(properties) {
    const { $scope, model } = this;
    const keys = Object.keys(properties);
    $scope.$evalAsync(() => {
      keys.forEach((key) => {
        if (Array.isArray(model[key])) {
          model[key].push(properties[key]);
        } else {
          model[key] = properties[key];
        }
      });
    });
  }
}
