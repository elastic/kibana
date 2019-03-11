/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export const elasticsearchJsPlugin = (Client, config, components) => {
  const ca = components.clientAction.factory;

  Client.prototype.fileupload = components.clientAction.namespaceFactory();
  const fileupload = Client.prototype.fileupload.prototype;

  /**
   * Perform a [fileupload.authenticate](Retrieve details about the currently authenticated user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  fileupload.jobs = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_fileupload/anomaly_detectors/',
      }
    ],
    method: 'GET'
  });

  fileupload.jobStats = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_stats',
        req: {
          jobId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_fileupload/anomaly_detectors/_stats',
      }
    ],
    method: 'GET'
  });

  fileupload.addJob = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>',
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

  fileupload.openJob = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_open',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  fileupload.closeJob = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_close?force=<%=force%>',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_close',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  fileupload.deleteJob = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>?&force=<%=force%>&wait_for_completion=false',
        req: {
          jobId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>?&wait_for_completion=false',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'DELETE'
  });

  fileupload.updateJob = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_update',
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

  fileupload.datafeeds = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_fileupload/datafeeds/',
      }
    ],
    method: 'GET'
  });

  fileupload.datafeedStats = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_stats',
        req: {
          datafeedId: {
            type: 'list'
          }
        }
      },
      {
        fmt: '/_fileupload/datafeeds/_stats',
      }
    ],
    method: 'GET'
  });

  fileupload.addDatafeed = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>',
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

  fileupload.updateDatafeed = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_update',
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

  fileupload.deleteDatafeed = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>?force=<%=force%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          force: {
            type: 'boolean'
          }
        }
      },
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'DELETE'
  });

  fileupload.startDatafeed = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>&end=<%=end%>',
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
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_start?&start=<%=start%>',
        req: {
          datafeedId: {
            type: 'string'
          },
          start: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_start',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  fileupload.stopDatafeed = ca({
    urls: [
      {
        fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_stop',
        req: {
          datafeedId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  fileupload.validateDetector = ca({
    url: {
      fmt: '/_fileupload/anomaly_detectors/_validate/detector'
    },
    needBody: true,
    method: 'POST'
  });

  fileupload.datafeedPreview = ca({
    url: {
      fmt: '/_fileupload/datafeeds/<%=datafeedId%>/_preview',
      req: {
        datafeedId: {
          type: 'string'
        }
      }
    },
    method: 'GET'
  });

  fileupload.forecast = ca({
    urls: [
      {
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_forecast?&duration=<%=duration%>',
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
        fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/_forecast',
        req: {
          jobId: {
            type: 'string'
          }
        }
      }
    ],
    method: 'POST'
  });

  fileupload.overallBuckets = ca({
    url: {
      fmt: '/_fileupload/anomaly_detectors/<%=jobId%>/results/overall_buckets',
      req: {
        jobId: {
          type: 'string'
        }
      }
    },
    method: 'POST'
  });

  fileupload.privilegeCheck = ca({
    url: {
      fmt: '/_security/user/_has_privileges'
    },
    needBody: true,
    method: 'POST'
  });

  fileupload.calendars = ca({
    urls: [
      {
        fmt: '/_fileupload/calendars/<%=calendarId%>',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_fileupload/calendars/',
      }
    ],
    method: 'GET'
  });

  fileupload.deleteCalendar = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  fileupload.addCalendar = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'PUT'
  });

  fileupload.addJobToCalendar = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>/jobs/<%=jobId%>',
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

  fileupload.removeJobFromCalendar = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>/jobs/<%=jobId%>',
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

  fileupload.events = ca({
    urls: [
      {
        fmt: '/_fileupload/calendars/<%=calendarId%>/events',
        req: {
          calendarId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_fileupload/calendars/<%=calendarId%>/events?&job_id=<%=jobId%>',
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
        fmt: '/_fileupload/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>',
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
        fmt: '/_fileupload/calendars/<%=calendarId%>/events?&after=<%=start%>&before=<%=end%>&job_id=<%=jobId%>',
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

  fileupload.addEvent = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>/events',
      req: {
        calendarId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'POST'
  });

  fileupload.deleteEvent = ca({
    url: {
      fmt: '/_fileupload/calendars/<%=calendarId%>/events/<%=eventId%>',
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

  fileupload.filters = ca({
    urls: [
      {
        fmt: '/_fileupload/filters/<%=filterId%>',
        req: {
          filterId: {
            type: 'string'
          }
        }
      },
      {
        fmt: '/_fileupload/filters/',
      }
    ],
    method: 'GET'
  });

  fileupload.addFilter = ca({
    url: {
      fmt: '/_fileupload/filters/<%=filterId%>',
      req: {
        filterId: {
          type: 'string'
        }
      }
    },
    needBody: true,
    method: 'PUT'
  });

  fileupload.updateFilter = ca({
    urls: [
      {
        fmt: '/_fileupload/filters/<%=filterId%>/_update',
        req: {
          filterId: {
            type: 'string'
          }
        }
      }
    ],
    needBody: true,
    method: 'POST'
  });

  fileupload.deleteFilter = ca({
    url: {
      fmt: '/_fileupload/filters/<%=filterId%>',
      req: {
        filterId: {
          type: 'string'
        }
      }
    },
    method: 'DELETE'
  });

  fileupload.info = ca({
    url: {
      fmt: '/_fileupload/info'
    },
    method: 'GET'
  });

  fileupload.fileStructure = ca({
    urls: [
      {
        // eslint-disable-next-line max-len
        fmt: '/_fileupload/find_file_structure?&charset=<%=charset%>&format=<%=format%>&has_header_row=<%=has_header_row%>&column_names=<%=column_names%>&delimiter=<%=delimiter%>&quote=<%=quote%>&should_trim_fields=<%=should_trim_fields%>&grok_pattern=<%=grok_pattern%>&timestamp_field=<%=timestamp_field%>&timestamp_format=<%=timestamp_format%>&lines_to_sample=<%=lines_to_sample%>',
        req: {
          charset: {
            type: 'string'
          },
          format: {
            type: 'string'
          },
          has_header_row: {
            type: 'string'
          },
          column_names: {
            type: 'string'
          },
          delimiter: {
            type: 'string'
          },
          quote: {
            type: 'string'
          },
          should_trim_fields: {
            type: 'string'
          },
          grok_pattern: {
            type: 'string'
          },
          timestamp_field: {
            type: 'string'
          },
          timestamp_format: {
            type: 'string'
          },
          lines_to_sample: {
            type: 'string'
          },
        }
      },
      {
        fmt: '/_fileupload/find_file_structure'
      }
    ],
    needBody: true,
    method: 'POST'
  });

};
