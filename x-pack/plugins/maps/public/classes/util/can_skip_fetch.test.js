/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canSkipSourceUpdate, updateDueToExtent } from './can_skip_fetch';
import { DataRequest } from './data_request';

describe('updateDueToExtent', () => {
  it('should be false when buffers are the same', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(false);
  });

  it('should be false when the new buffer is contained in the old buffer', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 10,
      maxLon: 100,
      minLat: 5,
      minLon: 95,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(false);
  });

  it('should be true when the new buffer is contained in the old buffer and the past results were truncated', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 10,
      maxLon: 100,
      minLat: 5,
      minLon: 95,
    };
    expect(
      updateDueToExtent({ buffer: oldBuffer, areResultsTrimmed: true }, { buffer: newBuffer })
    ).toBe(true);
  });

  it('should be true when meta has no old buffer', async () => {
    expect(updateDueToExtent()).toBe(true);
  });

  it('should be true when the new buffer is not contained in the old buffer', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 7.5,
      maxLon: 92.5,
      minLat: -2.5,
      minLon: 82.5,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(true);
  });
});

describe('canSkipSourceUpdate', () => {
  const SOURCE_DATA_REQUEST_ID = 'foo';
  const getUpdateDueToTimeslice = () => {
    return true;
  };

  describe('isQueryAware', () => {
    const queryAwareSourceMock = {
      isTimeAware: () => {
        return false;
      },
      isRefreshTimerAware: () => {
        return false;
      },
      isFilterByMapBounds: () => {
        return false;
      },
      isFieldAware: () => {
        return false;
      },
      isQueryAware: () => {
        return true;
      },
      isGeoGridPrecisionAware: () => {
        return false;
      },
    };
    const prevFilters = [];
    const prevQuery = {
      language: 'kuery',
      query: 'machine.os.keyword : "win 7"',
      queryLastTriggeredAt: '2019-04-25T20:53:22.331Z',
    };

    describe('applyGlobalQuery is false', () => {
      const prevApplyGlobalQuery = false;

      const prevDataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataMeta: {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        },
        data: {},
      });

      it('can skip update when filter changes', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [prevQuery],
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when query changes', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can not skip update when query is refreshed', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            queryLastTriggeredAt: 'sometime layer when Refresh button is clicked',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const nextMeta = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });
    });

    describe('applyGlobalQuery is true', () => {
      const prevApplyGlobalQuery = true;

      const prevDataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataMeta: {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        },
        data: {},
      });

      it('can not skip update when filter changes', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [prevQuery],
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query changes', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query is refreshed', async () => {
        const nextMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            queryLastTriggeredAt: 'sometime layer when Refresh button is clicked',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const nextMeta = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock,
          prevDataRequest,
          nextMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });
    });
  });

  describe('isTimeAware', () => {
    function createSourceMock() {
      return {
        isTimeAware: () => {
          return true;
        },
        isRefreshTimerAware: () => {
          return false;
        },
        isFilterByMapBounds: () => {
          return false;
        },
        isFieldAware: () => {
          return false;
        },
        isQueryAware: () => {
          return false;
        },
        isGeoGridPrecisionAware: () => {
          return false;
        },
      };
    }

    describe('applyGlobalTime', () => {
      it('can not skip update when applyGlobalTime changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock(),
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: false,
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when applyGlobalTime does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock(),
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });

    describe('timeFilters', () => {
      it('can not skip update when time range changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock(),
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when time range does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock(),
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-15m',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when time range changes but applyGlobalTime is false', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock(),
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: false,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: false,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });

    describe('timeslice', () => {
      const mockSource = createSourceMock();
      it('can not skip update when timeslice changes (undefined => provided)', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 0,
              to: 1000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when timeslice changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 1000,
              to: 2000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when timeslice changes (provided => undefined)', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when timeslice does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 0,
              to: 1000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when timeslice changes but applyGlobalTime is false', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataMeta: {
              applyGlobalTime: false,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextMeta: {
            applyGlobalTime: false,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 1000,
              to: 2000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });
  });
});
