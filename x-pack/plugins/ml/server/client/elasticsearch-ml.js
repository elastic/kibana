/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.ml = components.clientAction.namespaceFactory();
  const ml = Client.prototype.ml.prototype;

  /**
   * Perform a [ml.authenticate](Retrieve details about the currently authenticated user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  ml.jobs = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_xpack/ml/anomaly_detectors/',
      }
    ],
    method: 'GET'
  });

  ml.jobStats = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_stats',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_xpack/ml/anomaly_detectors/_stats',
      }
    ],
    method: 'GET'
  });

  ml.addJob = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ml.openJob = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_open',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.closeJob = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_close',
        req: {
          jobId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_close?force=true',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.deleteJob = ca({
    urls: [{
      fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>',
      req: {
        jobId: {
          type: 'string'
        }
      }
    }, {
      fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>?force=true',
      req: {
        jobId: {
          type: 'string'
        },
        force: {
          type: 'boolean'
        }
      }
    }],
    method: 'DELETE'
  });

  ml.updateJob = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_update',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.datafeeds = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_xpack/ml/datafeeds/',
      }
    ],
    method: 'GET'
  });

  ml.datafeedStats = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_stats',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_xpack/ml/datafeeds/_stats',
      }
    ],
    method: 'GET'
  });

  ml.addDatafeed = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'PUT'
  });

  ml.updateDatafeed = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_update',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  ml.deleteDatafeed = ca({
    urls: [{
      fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>',
      req: {
        datafeedId: {
          type: 'string'
        }
      }
    }, {
      fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>?force=true',
      req: {
        datafeedId: {
          type: 'string'
        },
        force: {
          type: 'boolean'
        }
      }
    }],
    method: 'DELETE'
  });

  ml.startDatafeed = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>&end=<%=end%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          start: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.stopDatafeed = ca({
    urls: [
      {
        fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_stop',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.validateDetector = ca({
    url: {
      fmt: '/_xpack/ml/anomaly_detectors/_validate/detector'
    },
    needBody: true,
    method: 'POST'
  });

  ml.datafeedPreview = ca({
    url: {
      fmt: '/_xpack/ml/datafeeds/<%=datafeedId%>/_preview',
      req: {
        datafeedId: {
          type: 'string'
        }
      }
    },
    method: 'GET'
  });

  ml.forecast = ca({
    urls: [
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_forecast?&duration=<%=duration%>',
        req: {
          jobId: {
            type: 'string'
          },
          duration: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/_forecast',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  ml.overallBuckets = ca({
    url: {
      fmt: '/_xpack/ml/anomaly_detectors/<%=jobId%>/results/overall_buckets',
      req: {
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'POST'
  });

  ml.privilegeCheck = ca({
    url: {
      fmt: '/_xpack/security/user/_has_privileges'
    },
    needBody: true,
    method: 'POST'
  });

  ml.calendars = ca({
    urls: [
      {
        fmt: '/_xpack/ml/calendars/<%=calendarId%>',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/calendars/',
      }
    ],
    method: 'GET'
  });

  ml.deleteCalendar = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.addCalendar = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'PUT'
  });

  ml.addJobToCalendar = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>/jobs/<%=jobId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'PUT'
  });

  ml.removeJobFromCalendar = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>/jobs/<%=jobId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.events = ca({
    urls: [
      {
        fmt: '/_xpack/ml/calendars/<%=calendarId%>/events',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/calendars/<%=calendarId%>/events?&job_id=<%=jobId%>',
        req: {
          calendarId: {
            type: 'string'
          },
          jobId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>',
        req: {
          calendarId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_xpack/ml/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>&job_id=<%=jobId%>',
        req: {
          calendarId: {
            type: 'string'
          },
          start: {
            type: 'string'
          },
          end: {
            type: 'string'
          },
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'GET'
  });

  ml.addEvent = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>/events',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'POST'
  });

  ml.deleteEvent = ca({
    url: {
      fmt: '/_xpack/ml/calendars/<%=calendarId%>/events/<%=eventId%>',
      req: {
        calendarId: {
          type: 'string'
        },
        eventId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  ml.info = ca({
    url: {
      fmt: '/_xpack/ml/info'
    },
    method: 'GET'
  });

};

