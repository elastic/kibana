/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';

export const apmTelemetry: SavedObjectsType = {
  name: 'apm-telemetry',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      agents: {
        properties: {
          dotnet: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          go: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          java: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          'js-base': {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          nodejs: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          python: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          ruby: {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          },
          'rum-js': {
            properties: {
              agent: {
                properties: {
                  version: {
                    type: 'keyword',
                    ignore_above: 1024
                  }
                }
              },
              service: {
                properties: {
                  framework: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  language: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  },
                  runtime: {
                    properties: {
                      composite: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      name: {
                        type: 'keyword',
                        ignore_above: 1024
                      },
                      version: {
                        type: 'keyword',
                        ignore_above: 1024
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      counts: {
        properties: {
          agent_configuration: {
            properties: {
              all: {
                type: 'long'
              }
            }
          },
          error: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          },
          max_error_groups_per_service: {
            properties: {
              '1d': {
                type: 'long'
              }
            }
          },
          max_transaction_groups_per_service: {
            properties: {
              '1d': {
                type: 'long'
              }
            }
          },
          metric: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          },
          onboarding: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          },
          services: {
            properties: {
              '1d': {
                type: 'long'
              }
            }
          },
          sourcemap: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          },
          span: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          },
          traces: {
            properties: {
              '1d': {
                type: 'long'
              }
            }
          },
          transaction: {
            properties: {
              '1d': {
                type: 'long'
              },
              all: {
                type: 'long'
              }
            }
          }
        }
      },
      cardinality: {
        properties: {
          user_agent: {
            properties: {
              original: {
                properties: {
                  all_agents: {
                    properties: {
                      '1d': {
                        type: 'long'
                      }
                    }
                  },
                  rum: {
                    properties: {
                      '1d': {
                        type: 'long'
                      }
                    }
                  }
                }
              }
            }
          },
          transaction: {
            properties: {
              name: {
                properties: {
                  all_agents: {
                    properties: {
                      '1d': {
                        type: 'long'
                      }
                    }
                  },
                  rum: {
                    properties: {
                      '1d': {
                        type: 'long'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      has_any_services: {
        type: 'boolean'
      },
      indices: {
        properties: {
          all: {
            properties: {
              total: {
                properties: {
                  docs: {
                    properties: {
                      count: {
                        type: 'long'
                      }
                    }
                  },
                  store: {
                    properties: {
                      size_in_bytes: {
                        type: 'long'
                      }
                    }
                  }
                }
              }
            }
          },
          shards: {
            properties: {
              total: {
                type: 'long'
              }
            }
          }
        }
      },
      integrations: {
        properties: {
          ml: {
            properties: {
              all_jobs_count: {
                type: 'long'
              }
            }
          }
        }
      },
      retainment: {
        properties: {
          error: {
            properties: {
              ms: {
                type: 'long'
              }
            }
          },
          metric: {
            properties: {
              ms: {
                type: 'long'
              }
            }
          },
          onboarding: {
            properties: {
              ms: {
                type: 'long'
              }
            }
          },
          span: {
            properties: {
              ms: {
                type: 'long'
              }
            }
          },
          transaction: {
            properties: {
              ms: {
                type: 'long'
              }
            }
          }
        }
      },
      services_per_agent: {
        properties: {
          dotnet: {
            type: 'long',
            null_value: 0
          },
          go: {
            type: 'long',
            null_value: 0
          },
          java: {
            type: 'long',
            null_value: 0
          },
          'js-base': {
            type: 'long',
            null_value: 0
          },
          nodejs: {
            type: 'long',
            null_value: 0
          },
          python: {
            type: 'long',
            null_value: 0
          },
          ruby: {
            type: 'long',
            null_value: 0
          },
          'rum-js': {
            type: 'long',
            null_value: 0
          }
        }
      },
      tasks: {
        properties: {
          agent_configuration: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          agents: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          cardinality: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          groupings: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          indices_stats: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          integrations: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          processor_events: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          services: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          },
          versions: {
            properties: {
              took: {
                properties: {
                  ms: {
                    type: 'long'
                  }
                }
              }
            }
          }
        }
      },
      version: {
        properties: {
          apm_server: {
            properties: {
              major: {
                type: 'long'
              },
              minor: {
                type: 'long'
              },
              patch: {
                type: 'long'
              }
            }
          }
        }
      }
    } as SavedObjectsType['mappings']['properties']
  }
};
