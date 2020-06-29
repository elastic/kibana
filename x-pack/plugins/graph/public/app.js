/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Provider } from 'react-redux';
import { isColorDark, hexToRgb } from '@elastic/eui';

import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { showSaveModal } from '../../../../src/plugins/saved_objects/public';

import appTemplate from './angular/templates/index.html';
import listingTemplate from './angular/templates/listing_ng_wrapper.html';
import { getReadonlyBadge } from './badge';

import { GraphApp } from './components/app';
import { VennDiagram } from './components/venn_diagram';
import { Listing } from './components/listing';
import { Settings } from './components/settings';
import { GraphVisualization } from './components/graph_visualization';

import { createWorkspace } from './angular/graph_client_workspace.js';
import { getEditUrl, getNewPath, getEditPath, setBreadcrumbs } from './services/url';
import { createCachedIndexPatternProvider } from './services/index_pattern_cache';
import { urlTemplateRegex } from './helpers/url_template';
import { asAngularSyncedObservable } from './helpers/as_observable';
import { colorChoices } from './helpers/style_choices';
import { createGraphStore, datasourceSelector, hasFieldsSelector } from './state_management';
import { formatHttpError } from './helpers/format_http_error';
import {
  findSavedWorkspace,
  getSavedWorkspace,
  deleteSavedWorkspace,
} from './helpers/saved_workspace_utils';

export function initGraphApp(angularModule, deps) {
  const {
    chrome,
    toastNotifications,
    savedObjectsClient,
    indexPatterns,
    addBasePath,
    getBasePath,
    data,
    capabilities,
    coreStart,
    storage,
    canEditDrillDownUrls,
    graphSavePolicy,
    overlays,
    savedObjects,
  } = deps;

  const app = angularModule;

  app.directive('vennDiagram', function (reactDirective) {
    return reactDirective(VennDiagram);
  });

  app.directive('graphVisualization', function (reactDirective) {
    return reactDirective(GraphVisualization);
  });

  app.directive('graphListing', function (reactDirective) {
    return reactDirective(Listing, [
      ['coreStart', { watchDepth: 'reference' }],
      ['createItem', { watchDepth: 'reference' }],
      ['findItems', { watchDepth: 'reference' }],
      ['deleteItems', { watchDepth: 'reference' }],
      ['editItem', { watchDepth: 'reference' }],
      ['getViewUrl', { watchDepth: 'reference' }],
      ['listingLimit', { watchDepth: 'reference' }],
      ['hideWriteControls', { watchDepth: 'reference' }],
      ['capabilities', { watchDepth: 'reference' }],
      ['initialFilter', { watchDepth: 'reference' }],
      ['initialPageSize', { watchDepth: 'reference' }],
    ]);
  });

  app.directive('graphApp', function (reactDirective) {
    return reactDirective(
      GraphApp,
      [
        ['storage', { watchDepth: 'reference' }],
        ['isInitialized', { watchDepth: 'reference' }],
        ['currentIndexPattern', { watchDepth: 'reference' }],
        ['indexPatternProvider', { watchDepth: 'reference' }],
        ['isLoading', { watchDepth: 'reference' }],
        ['onQuerySubmit', { watchDepth: 'reference' }],
        ['initialQuery', { watchDepth: 'reference' }],
        ['confirmWipeWorkspace', { watchDepth: 'reference' }],
        ['coreStart', { watchDepth: 'reference' }],
        ['noIndexPatterns', { watchDepth: 'reference' }],
        ['reduxStore', { watchDepth: 'reference' }],
        ['pluginDataStart', { watchDepth: 'reference' }],
      ],
      { restrict: 'A' }
    );
  });

  app.directive('graphVisualization', function (reactDirective) {
    return reactDirective(GraphVisualization, undefined, { restrict: 'A' });
  });

  app.config(function ($routeProvider) {
    $routeProvider
      .when('/home', {
        template: listingTemplate,
        badge: getReadonlyBadge,
        controller: function ($location, $scope) {
          $scope.listingLimit = savedObjects.settings.getListingLimit();
          $scope.initialPageSize = savedObjects.settings.getPerPage();
          $scope.create = () => {
            $location.url(getNewPath());
          };
          $scope.find = (search) => {
            return findSavedWorkspace(
              { savedObjectsClient, basePath: coreStart.http.basePath },
              search,
              $scope.listingLimit
            );
          };
          $scope.editItem = (workspace) => {
            $location.url(getEditPath(workspace));
          };
          $scope.getViewUrl = (workspace) => getEditUrl(addBasePath, workspace);
          $scope.delete = (workspaces) =>
            deleteSavedWorkspace(
              savedObjectsClient,
              workspaces.map(({ id }) => id)
            );
          $scope.capabilities = capabilities;
          $scope.initialFilter = $location.search().filter || '';
          $scope.coreStart = coreStart;
          setBreadcrumbs({ chrome });
        },
      })
      .when('/workspace/:id?', {
        template: appTemplate,
        badge: getReadonlyBadge,
        resolve: {
          savedWorkspace: function ($rootScope, $route, $location) {
            return $route.current.params.id
              ? getSavedWorkspace(savedObjectsClient, $route.current.params.id).catch(function (e) {
                  toastNotifications.addError(e, {
                    title: i18n.translate('xpack.graph.missingWorkspaceErrorMessage', {
                      defaultMessage: "Couldn't load graph with ID",
                    }),
                  });
                  $rootScope.$eval(() => {
                    $location.path('/home');
                    $location.replace();
                  });
                  // return promise that never returns to prevent the controller from loading
                  return new Promise();
                })
              : getSavedWorkspace(savedObjectsClient);
          },
          indexPatterns: function () {
            return savedObjectsClient
              .find({
                type: 'index-pattern',
                fields: ['title', 'type'],
                perPage: 10000,
              })
              .then((response) => response.savedObjects);
          },
          GetIndexPatternProvider: function () {
            return indexPatterns;
          },
        },
      })
      .otherwise({
        redirectTo: '/home',
      });
  });

  //========  Controller for basic UI ==================
  app.controller('graphuiPlugin', function ($scope, $route, $location) {
    function handleError(err) {
      const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
        defaultMessage: 'Graph Error',
        description: '"Graph" is a product name and should not be translated.',
      });
      if (err instanceof Error) {
        toastNotifications.addError(err, {
          title: toastTitle,
        });
      } else {
        toastNotifications.addDanger({
          title: toastTitle,
          text: String(err),
        });
      }
    }

    async function handleHttpError(error) {
      toastNotifications.addDanger(formatHttpError(error));
    }

    // Replacement function for graphClientWorkspace's comms so
    // that it works with Kibana.
    function callNodeProxy(indexName, query, responseHandler) {
      const request = {
        body: JSON.stringify({
          index: indexName,
          query: query,
        }),
      };
      $scope.loading = true;
      return coreStart.http
        .post('../api/graph/graphExplore', request)
        .then(function (data) {
          const response = data.resp;
          if (response.timed_out) {
            toastNotifications.addWarning(
              i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
                defaultMessage: 'Exploration timed out',
              })
            );
          }
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => {
          $scope.loading = false;
          $scope.$digest();
        });
    }

    //Helper function for the graphClientWorkspace to perform a query
    const callSearchNodeProxy = function (indexName, query, responseHandler) {
      const request = {
        body: JSON.stringify({
          index: indexName,
          body: query,
        }),
      };
      $scope.loading = true;
      coreStart.http
        .post('../api/graph/searchProxy', request)
        .then(function (data) {
          const response = data.resp;
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => {
          $scope.loading = false;
          $scope.$digest();
        });
    };

    $scope.indexPatternProvider = createCachedIndexPatternProvider(
      $route.current.locals.GetIndexPatternProvider.get
    );

    const store = createGraphStore({
      basePath: getBasePath(),
      addBasePath,
      indexPatternProvider: $scope.indexPatternProvider,
      indexPatterns: $route.current.locals.indexPatterns,
      createWorkspace: (indexPattern, exploreControls) => {
        const options = {
          indexName: indexPattern,
          vertex_fields: [],
          // Here we have the opportunity to look up labels for nodes...
          nodeLabeller: function () {
            //   console.log(newNodes);
          },
          changeHandler: function () {
            //Allows DOM to update with graph layout changes.
            $scope.$apply();
          },
          graphExploreProxy: callNodeProxy,
          searchProxy: callSearchNodeProxy,
          exploreControls,
        };
        $scope.workspace = createWorkspace(options);
      },
      setLiveResponseFields: (fields) => {
        $scope.liveResponseFields = fields;
      },
      setUrlTemplates: (urlTemplates) => {
        $scope.urlTemplates = urlTemplates;
      },
      getWorkspace: () => {
        return $scope.workspace;
      },
      getSavedWorkspace: () => {
        return $route.current.locals.savedWorkspace;
      },
      notifications: coreStart.notifications,
      http: coreStart.http,
      overlays: coreStart.overlays,
      savedObjectsClient,
      showSaveModal,
      setWorkspaceInitialized: () => {
        $scope.workspaceInitialized = true;
      },
      savePolicy: graphSavePolicy,
      changeUrl: (newUrl) => {
        $scope.$evalAsync(() => {
          $location.url(newUrl);
        });
      },
      notifyAngular: () => {
        $scope.$digest();
      },
      chrome,
      I18nContext: coreStart.i18n.Context,
    });

    // register things on scope passed down to react components
    $scope.pluginDataStart = data;
    $scope.storage = storage;
    $scope.coreStart = coreStart;
    $scope.loading = false;
    $scope.reduxStore = store;
    $scope.savedWorkspace = $route.current.locals.savedWorkspace;

    // register things for legacy angular UI
    const allSavingDisabled = graphSavePolicy === 'none';
    $scope.spymode = 'request';
    $scope.colors = colorChoices;
    $scope.isColorDark = (color) => isColorDark(...hexToRgb(color));
    $scope.nodeClick = function (n, $event) {
      //Selection logic - shift key+click helps selects multiple nodes
      // Without the shift key we deselect all prior selections (perhaps not
      // a great idea for touch devices with no concept of shift key)
      if (!$event.shiftKey) {
        const prevSelection = n.isSelected;
        $scope.workspace.selectNone();
        n.isSelected = prevSelection;
      }

      if ($scope.workspace.toggleNodeSelection(n)) {
        $scope.selectSelected(n);
      } else {
        $scope.detail = null;
      }
    };

    $scope.clickEdge = function (edge) {
      $scope.workspace.getAllIntersections($scope.handleMergeCandidatesCallback, [
        edge.topSrc,
        edge.topTarget,
      ]);
    };

    $scope.submit = function (searchTerm) {
      $scope.workspaceInitialized = true;
      const numHops = 2;
      if (searchTerm.startsWith('{')) {
        try {
          const query = JSON.parse(searchTerm);
          if (query.vertices) {
            // Is a graph explore request
            $scope.workspace.callElasticsearch(query);
          } else {
            // Is a regular query DSL query
            $scope.workspace.search(query, $scope.liveResponseFields, numHops);
          }
        } catch (err) {
          handleError(err);
        }
        return;
      }
      $scope.workspace.simpleSearch(searchTerm, $scope.liveResponseFields, numHops);
    };

    $scope.selectSelected = function (node) {
      $scope.detail = {
        latestNodeSelection: node,
      };
      return ($scope.selectedSelectedVertex = node);
    };

    $scope.isSelectedSelected = function (node) {
      return $scope.selectedSelectedVertex === node;
    };

    $scope.openUrlTemplate = function (template) {
      const url = template.url;
      const newUrl = url.replace(urlTemplateRegex, template.encoder.encode($scope.workspace));
      window.open(newUrl, '_blank');
    };

    $scope.aceLoaded = (editor) => {
      editor.$blockScrolling = Infinity;
    };

    $scope.setDetail = function (data) {
      $scope.detail = data;
    };

    function canWipeWorkspace(callback, text, options) {
      if (!hasFieldsSelector(store.getState())) {
        callback();
        return;
      }
      const confirmModalOptions = {
        confirmButtonText: i18n.translate('xpack.graph.leaveWorkspace.confirmButtonLabel', {
          defaultMessage: 'Leave anyway',
        }),
        title: i18n.translate('xpack.graph.leaveWorkspace.modalTitle', {
          defaultMessage: 'Unsaved changes',
        }),
        'data-test-subj': 'confirmModal',
        ...options,
      };

      overlays
        .openConfirm(
          text ||
            i18n.translate('xpack.graph.leaveWorkspace.confirmText', {
              defaultMessage: 'If you leave now, you will lose unsaved changes.',
            }),
          confirmModalOptions
        )
        .then((isConfirmed) => {
          if (isConfirmed) {
            callback();
          }
        });
    }
    $scope.confirmWipeWorkspace = canWipeWorkspace;

    $scope.performMerge = function (parentId, childId) {
      let found = true;
      while (found) {
        found = false;
        for (const i in $scope.detail.mergeCandidates) {
          if ($scope.detail.mergeCandidates.hasOwnProperty(i)) {
            const mc = $scope.detail.mergeCandidates[i];
            if (mc.id1 === childId || mc.id2 === childId) {
              $scope.detail.mergeCandidates.splice(i, 1);
              found = true;
              break;
            }
          }
        }
      }
      $scope.workspace.mergeIds(parentId, childId);
      $scope.detail = null;
    };

    $scope.handleMergeCandidatesCallback = function (termIntersects) {
      const mergeCandidates = [];
      termIntersects.forEach((ti) => {
        mergeCandidates.push({
          id1: ti.id1,
          id2: ti.id2,
          term1: ti.term1,
          term2: ti.term2,
          v1: ti.v1,
          v2: ti.v2,
          overlap: ti.overlap,
        });
      });
      $scope.detail = { mergeCandidates };
    };

    // ===== Menubar configuration =========
    $scope.topNavMenu = [];
    $scope.topNavMenu.push({
      key: 'new',
      label: i18n.translate('xpack.graph.topNavMenu.newWorkspaceLabel', {
        defaultMessage: 'New',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.newWorkspaceAriaLabel', {
        defaultMessage: 'New Workspace',
      }),
      tooltip: i18n.translate('xpack.graph.topNavMenu.newWorkspaceTooltip', {
        defaultMessage: 'Create a new workspace',
      }),
      run: function () {
        canWipeWorkspace(function () {
          $scope.$evalAsync(() => {
            if ($location.url() === '/workspace/') {
              $route.reload();
            } else {
              $location.url('/workspace/');
            }
          });
        });
      },
      testId: 'graphNewButton',
    });

    // if saving is disabled using uiCapabilities, we don't want to render the save
    // button so it's consistent with all of the other applications
    if (capabilities.save) {
      // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality

      $scope.topNavMenu.push({
        key: 'save',
        label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
          defaultMessage: 'Save',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
          defaultMessage: 'Save workspace',
        }),
        tooltip: () => {
          if (allSavingDisabled) {
            return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
              defaultMessage:
                'No changes to saved workspaces are permitted by the current save policy',
            });
          } else {
            return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
              defaultMessage: 'Save this workspace',
            });
          }
        },
        disableButton: function () {
          return allSavingDisabled || !hasFieldsSelector(store.getState());
        },
        run: () => {
          store.dispatch({
            type: 'x-pack/graph/SAVE_WORKSPACE',
            payload: $route.current.locals.savedWorkspace,
          });
        },
        testId: 'graphSaveButton',
      });
    }
    $scope.topNavMenu.push({
      key: 'inspect',
      disableButton: function () {
        return $scope.workspace === null;
      },
      label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
        defaultMessage: 'Inspect',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.inspectAriaLabel', {
        defaultMessage: 'Inspect',
      }),
      run: () => {
        $scope.$evalAsync(() => {
          const curState = $scope.menus.showInspect;
          $scope.closeMenus();
          $scope.menus.showInspect = !curState;
        });
      },
    });

    $scope.topNavMenu.push({
      key: 'settings',
      disableButton: function () {
        return datasourceSelector(store.getState()).type === 'none';
      },
      label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
        defaultMessage: 'Settings',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
        defaultMessage: 'Settings',
      }),
      run: () => {
        const settingsObservable = asAngularSyncedObservable(
          () => ({
            blacklistedNodes: $scope.workspace ? [...$scope.workspace.blacklistedNodes] : undefined,
            unblacklistNode: $scope.workspace ? $scope.workspace.unblacklist : undefined,
            canEditDrillDownUrls: canEditDrillDownUrls,
          }),
          $scope.$digest.bind($scope)
        );
        coreStart.overlays.openFlyout(
          toMountPoint(
            <Provider store={store}>
              <Settings observable={settingsObservable} />
            </Provider>
          ),
          {
            size: 'm',
            closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', {
              defaultMessage: 'Close',
            }),
            'data-test-subj': 'graphSettingsFlyout',
            ownFocus: true,
            className: 'gphSettingsFlyout',
            maxWidth: 520,
          }
        );
      },
    });

    // Allow URLs to include a user-defined text query
    if ($route.current.params.query) {
      $scope.initialQuery = $route.current.params.query;
      const unbind = $scope.$watch('workspace', () => {
        if (!$scope.workspace) {
          return;
        }
        unbind();
        $scope.submit($route.current.params.query);
      });
    }

    $scope.menus = {
      showSettings: false,
    };

    $scope.closeMenus = () => {
      _.forOwn($scope.menus, function (_, key) {
        $scope.menus[key] = false;
      });
    };

    // Deal with situation of request to open saved workspace
    if ($route.current.locals.savedWorkspace.id) {
      store.dispatch({
        type: 'x-pack/graph/LOAD_WORKSPACE',
        payload: $route.current.locals.savedWorkspace,
      });
    } else {
      $scope.noIndexPatterns = $route.current.locals.indexPatterns.length === 0;
    }
  });
  //End controller
}
