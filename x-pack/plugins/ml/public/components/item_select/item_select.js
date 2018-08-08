/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './item_select.html';

import { InitAfterBindingsWorkaround } from 'ui/compat';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlItemSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      itemIds: '=',
      allItems: '=',
      disabled: '=',
      placeholder: '=',
      externalUpdateFunction: '=',
      allowTagging: '=',
      taggingText: '='
    },
    controllerAs: 'mlItemSelect',
    bindToController: true,
    controller: class MlItemSelectController extends InitAfterBindingsWorkaround {
      initAfterBindings($scope) {
        this.$scope = $scope;
        this.selectedItems = [];

        this.populateSelectedItems(this.itemIds);

        // make the populateSelectedItems function callable from elsewhere.
        if (this.externalUpdateFunction !== undefined) {
          this.externalUpdateFunction.update = (itemIds) => { this.populateSelectedItems(itemIds); };
        }
      }

      // populate selectedItems based on a list of ids
      populateSelectedItems(ids) {
        this.selectedItems = ids.map(id => this.allItems.find((i) => i.id === id));
      }

      onItemsChanged() {
        // wipe the groups and add all of the selected ids
        this.itemIds.length = 0;
        this.itemIds = this.selectedItems.map((i) => i.id);
      }

      createNewItem(id) {
        return ({
          id: id.toLowerCase(),
          isTag: true
        });
      }

      // non-tagging function needed as
      // the tagging attribute in the html needs a function reference
      // this is used when tagging is not allowed and always returns false
      dontCreateNewItem() {
        return false;
      }

    }
  };
});
