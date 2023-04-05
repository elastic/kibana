/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessEventResults } from '../../types/process_tree';

export const sessionViewIOEventsMock: ProcessEventResults = {
  events: [
    {
      _index: 'logs-endpoint.events.process',
      _id: '1',
      _source: {
        '@timestamp': '2022-07-14T11:16:29.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '1',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '1',
          name: 'bash',
          executable: '/bin/bash',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: "256\n,\n                             Some Companies Puppet instance\n             |  |    |       CentOS Stream release 8 on x86_64\n  ***********************    Load average: 1.23, 1.01, 0.63\n  ************************   \n  ************************   Hostname ********\n  \\                          Type       xyz\n  o                          Datacenter ********\n                             Cluster ********\n\n\n\n\n,0 loaded units listed. Pass --all to see loaded but inactive units, too.\nTo show all installed unit files use 'systemctl list-unit-files'.\n",
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '2',
      _source: {
        '@timestamp': '2022-07-14T11:16:30.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '2',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: ',\u001b[?2004h\u001b[?1049h\u001b[22;0;0t\u001b[?1h\u001b=\u001b[?2004h\u001b[1;59r\u001b[?12h\u001b[?12l\u001b[27m\u001b[29m\u001b[m\u001b[H\u001b[2J\u001b[?25l\u001b[59;1H"/usr/local/bin/script_one.sh" [readonly] 14L, 397C\u001b[1;1H#!/bin/env bash\n# Copyright (C) 2022, ********(R) Corporation. All rights reserved.\n\n# Script for setting the reject of queries in Mysql\n\nmysql -h127.0.0.1 -P6033 -uroot -e "set global wsrep_reject_queries=\'NONE\'" 2>&1\nRC=$?\n\nif [[ $RC != 0 ]]; then\n  >&2 echo "Failed to unset the reject of queries on Mysql node, exiting."\n  exit $RC\nelse\n  echo "Successfully unset the reject of queries."\nfi\n\u001b[94m~                                                                                                                                                                           \u001b[16;1H~                                                                                                                                                                           \u001b[17;1H~                                                                                                                                                                           \u001b[18;1H~                                                                                                                                                                           \u001b[19;1H~                                                                                                                                                                           \u001b[20;1H~                                                                                                                                                                           \u001b[21;1H~                                                                                                                                                                           \u001b[22;1H~                                                                                                                                                                           \u001b[23;1H~                                                                                                                                                                           \u001b[24;1H~                                                                                                                                                                           \u001b[25;1H~                                                                                                                                                                           \u001b[26;1H~                                                                                                                                                                           \u001b[27;1H~                                                                                                                                                                           \u001b[28;1H~                                                                                                                                                                           \u001b[29;1H~                                                                                                                                                                           \u001b[30;1H~                                                                                                                                                                           \u001b[31;1H~                                                                                                                                                                           \u001b[32;1H~                                                                                                                                                                           \u001b[33;1H~                                                                                                                                                                           \u001b[34;1H~                                                                                                                                                                           \u001b[35;1H~                                                                                                                                                                           \u001b[36;1H~                                                                                                                                                                           \u001b[37;1H~                                                                                                                                                                           \u001b[38;1H~                                                                                                                                                                           \u001b[39;1H~                                                                                                                                                                           \u001b[40;1H~                                                                                                                                                                           \u001b[41;1H~                                                                                                                                                                           \u001b[42;1H~                                                                                                                                                                           \u001b[43;1H~                                                                                                                                                                           \u001b[44;1H~                                                                                                                                                                           \u001b[45;1H~                                                                                                                                                                           \u001b[46;1H~                                                                                                                                                                           \u001b[47;1H~                                                                                                                                                                           \u001b[48;1H~                                                                                                                                                                           \u001b[49;1H~                                                                                                                                                                           \u001b[50;1H~                                                                                                                                                                           \u001b[51;1H~                                                                                                                                                                           \u001b[52;1H~                                                                                                                                                                           \u001b[53;1H~                                                                                                                                                                           \u001b[54;1H~                                                                                                                                                                           \u001b[55;1H~                                                                                                                                                                           \u001b[56;1H~                                                                                                                                                                           \u001b[57;1H~                                                                                                                                                                           \u001b[58;1H~                                                                                                                                                                           \u001b[1;1H\u001b[?25h\u0007\u001b[?25l\u001b[m\u001b[59;1H\u001b[K\u001b[59;1H:\u001b[?2004h\u001b[?25hq\r\u001b[?25l\u001b[?2004l\u001b[59;1H\u001b[K\u001b[59;1H\u001b[?2004l\u001b[?1l\u001b>\u001b[?25h\u001b[?1049l\u001b[23;0;0t,\u001b[?2004h\u001b[?1049h\u001b[22;0;0t\u001b[?1h\u001b=\u001b[?2004h\u001b[1;59r\u001b[?12h\u001b[?12l\u001b[27m\u001b[29m\u001b[m\u001b[H\u001b[2J\u001b[?25l\u001b[59;1H"/usr/local/bin/script_two.sh" [readonly] 115L, 3570C\u001b[1;1H#!/bin/env bash\n# Copyright (C) 2022, ********(R) Corporation. All rights reserved.\n\n# Script for rejecting connection on Mysql cluster node, either gracefully or not,\n# depending on supplied arguments.\n\nfunction usage() {\n  echo "\n  This script disables DB connections to Mysql node.\n  The default is to stop them gracefully.\n\n  Usage: $0 [-h] [-w <wait_seconds>] [-s <sleep_seconds>] [-x]\n\n  Options:\n    -h    Prints this help.\n    -w    Number of seconds for waiting to close the connections.\u001b[17;11HDefault value is to wait for mysql-wait_timeout.\n    -s    Sleep interval between connections checks.\n    -x    Kills all connections immediately. Other options are ignored."\n  exit\n}\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '3',
      _source: {
        '@timestamp': '2022-07-14T11:16:31.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '3',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: '\nfunction get_number_db_connections() {\n    # count current\n    DB_CONNECTIONS_NUMBER=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select count(1) from stats_mysql_processlist where user = \'$DB_USER\' and db like \'db\\_%\' escapee\u001b[26;1H \'\\\'")\n}\n\nfunction set_number_grace_seconds() {\n    local mysql_wait_timeout_ms=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select variable_value from global_variables where variable_name = \'mysql-wait_timeout\'")\n    GRACE_PERIOD=$((($mysql_wait_timeout_ms+1000-1)/1000))\n}\n\nfunction wait_for_connections() {\n    local number_of_loops=$(((($GRACE_PERIOD+$SLEEP_INTERVAL-1)/$SLEEP_INTERVAL)))\u001b[37;5Hecho "Waiting for connections to close for up to $GRACE_PERIOD seconds"\u001b[39;5Hfor i in $(seq 0 $number_of_loops); do\u001b[40;9Hget_number_db_connections\u001b[41;9Hif [[ $DB_CONNECTIONS_NUMBER -eq 0 ]]; then\u001b[42;13Hecho "No connection found for user $DB_USER to this node"\u001b[43;13Hbreak\u001b[44;9Helse\u001b[45;13Hecho "$DB_CONNECTIONS_NUMBER connection(s) found, waiting for ${SLEEP_INTERVAL}s, round $i"\u001b[46;13Hsleep $SLEEP_INTERVAL\u001b[47;9Hfi\n    done\n}\n\nfunction parse_args() {\n    while getopts \'hs:w:x\' opt; do\u001b[53;9Hcase "$opt" in\u001b[54;9Hh)\u001b[55;13Husage\u001b[56;13H;;\u001b[57;9Hs)\u001b[58;13Hif ! [[ $OPTARG =~ ^[0-9]+$ ]]; then\u001b[1;1H\u001b[?25h\u001b[?25l\u001b[59;1H\u001b[K\u001b[59;1H:\u001b[?2004h\u001b[?25hset number\r\u001b[?25l\u001b[1;1H\u001b[38;5;130m      1 \u001b[m#!/bin/env bash\n\u001b[38;5;130m      2 \u001b[m# Copyright (C) 2022, ********(R) Corporation. All rights reserved.\n\u001b[38;5;130m      3 \n      4 \u001b[m# Script for rejecting connection on Mysql cluster node, either gracefully or not,\n\u001b[38;5;130m      5 \u001b[m# depending on supplied arguments.\n\u001b[38;5;130m      6 \n      7 \u001b[mfunction usage() {\n\u001b[38;5;130m      8 \u001b[m  echo "\n\u001b[38;5;130m      9 \u001b[m  This script disables DB connections to Mysql node.\n\u001b[38;5;130m     10 \u001b[m  The default is to stop them gracefully.\n\u001b[38;5;130m     11 \n     12 \u001b[m  Usage: $0 [-h] [-w <wait_seconds>] [-s <sleep_seconds>] [-x]\n\u001b[38;5;130m     13 \n     14 \u001b[m  Options:\n\u001b[38;5;130m     15 \u001b[m    -h    Prints this help.\n\u001b[38;5;130m     16 \u001b[m    -w    Number of seconds for waiting to close the connections.\n\u001b[38;5;130m     17 \u001b[m          Default value is to wait for mysql-wait_timeout.\n\u001b[38;5;130m     18 \u001b[m    -s    Sleep interval between connections checks.\n\u001b[38;5;130m     19 \u001b[m    -x    Kills all connections immediately. Other options are ignored."\n\u001b[38;5;130m     20 \u001b[m  exit\n\u001b[38;5;130m     21 \u001b[m}\n\u001b[38;5;130m     22 \n     23 \u001b[mfunction get_number_db_connections() {\n\u001b[38;5;130m     24 \u001b[m    # count current\n\u001b[38;5;130m     25 \u001b[m    DB_CONNECTIONS_NUMBER=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select count(1) from stats_mysql_processlist where user = \'$DB_USER\' and db like \'db\\_%%\u001b[26;1H\u001b[38;5;130m        \u001b[m\' escape \'\\\'")\n\u001b[38;5;130m     26 \u001b[m}\n\u001b[38;5;130m     27 \n     28 \u001b[mfunction set_number_grace_seconds() {\n\u001b[38;5;130m     29 \u001b[m    local mysql_wait_timeout_ms=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select variable_value from global_variables where variable_name = \'mysql-wait_timm\u001b[31;1H\u001b[38;5;130m        \u001b[meout\'")\u001b[31;16H\u001b[K\u001b[32;1H\u001b[38;5;130m     30 \u001b[m    GRACE_PERIOD=$((($mysql_wait_timeout_ms+1000-1)/1000))\n\u001b[38;5;130m     31 \u001b[m}\n\u001b[38;5;130m     32 \u001b[m\u001b[34;10H\u001b[K\u001b[35;1H\u001b[38;5;130m     33 \u001b[mfunction wait_for_connections() {\u001b[35;42H\u001b[K\u001b[36;1H\u001b[38;5;130m     34 \u001b[m    local number_of_loops=$(((($GRACE_PERIOD+$SLEEP_INTERVAL-1)/$SLEEP_INTERVAL)))\n\u001b[38;5;130m     35 \u001b[m\u001b[37;10H\u001b[K\u001b[38;1H\u001b[38;5;130m     36 \u001b[m    echo "Waiting for connections to close for up to $GRACE_PERIOD seconds"\n\u001b[38;5;130m     37 \u001b[m\u001b[39;9H\u001b[K\u001b[40;1H\u001b[38;5;130m     38 \u001b[m    for i in $(seq 0 $number_of_loops); do\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '4',
      _source: {
        '@timestamp': '2022-07-14T11:16:32.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '4',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: '\u001b[38;5;130m     39 \u001b[m        get_number_db_connections\u001b[41;42H\u001b[K\u001b[42;1H\u001b[38;5;130m     40 \u001b[m        if [[ $DB_CONNECTIONS_NUMBER -eq 0 ]]; then\u001b[42;60H\u001b[K\u001b[43;1H\u001b[38;5;130m     41 \u001b[m            echo "No connection found for user $DB_USER to this node"\n\u001b[38;5;130m     42 \u001b[m    \u001b[8Cbreak\n\u001b[38;5;130m     43 \u001b[m        else\u001b[45;21H\u001b[K\u001b[46;1H\u001b[38;5;130m     44 \u001b[m            echo "$DB_CONNECTIONS_NUMBER connection(s) found, waiting for ${SLEEP_INTERVAL}s, round $i"\n\u001b[38;5;130m     45 \u001b[m  \u001b[10Csleep $SLEEP_INTERVAL\n\u001b[38;5;130m     46 \u001b[m\u001b[8Cfi\n\u001b[38;5;130m     47 \u001b[m    done\n\u001b[38;5;130m     48 \u001b[m}\n\u001b[38;5;130m     49 \u001b[m\u001b[51;10H\u001b[K\u001b[52;1H\u001b[38;5;130m     50 \u001b[mfunction parse_args() {\u001b[52;33H\u001b[K\u001b[53;1H\u001b[38;5;130m     51 \u001b[m    while getopts \'hs:w:x\' opt; do\n\u001b[38;5;130m     52 \u001b[m        case "$opt" in\n\u001b[38;5;130m     53 \u001b[m        h)\n\u001b[38;5;130m     54 \u001b[m            usage\n\u001b[38;5;130m     55 \u001b[m  \u001b[10C;;\n\u001b[38;5;130m     56 \u001b[m        s)\u001b[58;19H\u001b[K\u001b[1;9H\u001b[?25h\u001b[?25l\u001b[27m\u001b[29m\u001b[m\u001b[H\u001b[2J\u001b[1;1H\u001b[38;5;130m     58 \u001b[m\u001b[16C>&2 echo "Sleep interval (-s) must be a number"\n\u001b[38;5;130m     59 \u001b[m\u001b[16Cexit 1\n\u001b[38;5;130m     60 \u001b[m\u001b[12Cfi\n\u001b[38;5;130m     61 \u001b[m\u001b[12CARG_SLEEP_INTERVAL="$OPTARG"\n\u001b[38;5;130m     62 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     63 \u001b[m\u001b[8Cw)\n\u001b[38;5;130m     64 \u001b[m\u001b[12Cif ! [[ $OPTARG =~ ^[0-9]+$ ]]; then\n\u001b[38;5;130m     65 \u001b[m\u001b[16C>&2 echo "Wait timeout (-w) must be a number"\n\u001b[38;5;130m     66 \u001b[m\u001b[16Cexit 1\n\u001b[38;5;130m     67 \u001b[m\u001b[12Cfi\n\u001b[38;5;130m     68 \u001b[m\u001b[12CARG_GRACE_PERIOD="$OPTARG"\n\u001b[38;5;130m     69 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     70 \u001b[m\u001b[8Cx)\n\u001b[38;5;130m     71 \u001b[m\u001b[12CARG_KILL_IMMEDIATELY=1\n\u001b[38;5;130m     72 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     73 \u001b[m\u001b[8Cesac\n\u001b[38;5;130m     74 \u001b[m    done\n\u001b[38;5;130m     75 \n     76 \u001b[m  GRACE_PERIOD=${ARG_GRACE_PERIOD:--1}\n\u001b[38;5;130m     77 \u001b[m  SLEEP_INTERVAL=${ARG_SLEEP_INTERVAL:-30}\n\u001b[38;5;130m     78 \u001b[m  KILL_IMMEDIATELY=${ARG_KILL_IMMEDIATELY:-0}\n\u001b[38;5;130m     79 \u001b[m}\n\u001b[38;5;130m     80 \n     81 \u001b[mDB_USER="rolap01"\n\u001b[38;5;130m     82 \n     83 \u001b[mparse_args $@\n\u001b[38;5;130m     84 \n     85 \u001b[mif [[ $KILL_IMMEDIATELY == 1 ]]; then\n\u001b[38;5;130m     86 \u001b[m    echo "WARNING: Not waiting for connections to close gracefully"\n\u001b[38;5;130m     87 \u001b[m    echo "Press any key to continue... wsrep_reject_queries will be set to \'ALL_KILL\'"\n\u001b[38;5;130m     88 \u001b[m    read a\n\u001b[38;5;130m     89 \u001b[m    mysql -h127.0.0.1 -P3306 -uroot -e "set global wsrep_reject_queries=\'ALL_KILL\'"\n\u001b[38;5;130m     90 \u001b[melse\n\u001b[38;5;130m     91 \u001b[m    # Stop accepting queries in mariadb, do not kill opened connections\n\u001b[38;5;130m     92 \u001b[m    mysql -h127.0.0.1 -P3306 -uroot -e "set global wsrep_reject_queries=\'ALL\'"\n\u001b[38;5;130m     93 \u001b[mfi\n\u001b[38;5;130m     94 \n     95 \u001b[mexit_code=$?\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '5',
      _source: {
        '@timestamp': '2022-07-14T11:16:33.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '5',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: '\u001b[38;5;130m     96 \u001b[mif [[ $exit_code != 0 ]]; then\n\u001b[38;5;130m     97 \u001b[m    >&2 echo "Failed to set the reject of queries on Mysql node, exiting."\n\u001b[38;5;130m     98 \u001b[m    exit $exit_code\n\u001b[38;5;130m     99 \u001b[melse\n\u001b[38;5;130m    100 \u001b[m    echo "Successfully stopped accepting queries."\n\u001b[38;5;130m    101 \u001b[m    if [[ $KILL_IMMEDIATELY == 1 ]]; then\n\u001b[38;5;130m    102 \u001b[m\u001b[8Cexit\n\u001b[38;5;130m    103 \u001b[m    fi\n\u001b[38;5;130m    104 \u001b[mfi\n\u001b[38;5;130m    105 \n    106 \u001b[mif [[ $GRACE_PERIOD == -1 ]]; then\n\u001b[38;5;130m    107 \u001b[m    set_number_grace_seconds\n\u001b[38;5;130m    108 \u001b[mfi\n\u001b[38;5;130m    109 \n    110 \u001b[mwait_for_connections\n\u001b[38;5;130m    111 \u001b[mif [[ $DB_CONNECTIONS_NUMBER != 0 ]]; then\n\u001b[38;5;130m    112 \u001b[m    get_number_db_connections\n\u001b[38;5;130m    113 \u001b[m    >&2 echo "ERROR: There are still $DB_CONNECTIONS_NUMBER opened DB connections."\n\u001b[38;5;130m    114 \u001b[m    exit 3\n\u001b[38;5;130m    115 \u001b[mfi\b\b\u001b[?25h\u001b[?25l\u001b[27m\u001b[29m\u001b[m\u001b[H\u001b[2J\u001b[1;1H\u001b[38;5;130m      1 \u001b[m#!/bin/env bash\n\u001b[38;5;130m      2 \u001b[m# Copyright (C) 2022, ********(R) Corporation. All rights reserved.\n\u001b[38;5;130m      3 \n      4 \u001b[m# Script for rejecting connection on Mysql cluster node, either gracefully or not,\n\u001b[38;5;130m      5 \u001b[m# depending on supplied arguments.\n\u001b[38;5;130m      6 \n      7 \u001b[mfunction usage() {\n\u001b[38;5;130m      8 \u001b[m  echo "\n\u001b[38;5;130m      9 \u001b[m  This script disables DB connections to Mysql node.\n\u001b[38;5;130m     10 \u001b[m  The default is to stop them gracefully.\n\u001b[38;5;130m     11 \n     12 \u001b[m  Usage: $0 [-h] [-w <wait_seconds>] [-s <sleep_seconds>] [-x]\n\u001b[38;5;130m     13 \n     14 \u001b[m  Options:\n\u001b[38;5;130m     15 \u001b[m    -h    Prints this help.\n\u001b[38;5;130m     16 \u001b[m    -w    Number of seconds for waiting to close the connections.\n\u001b[38;5;130m     17 \u001b[m\u001b[10CDefault value is to wait for mysql-wait_timeout.\n\u001b[38;5;130m     18 \u001b[m    -s    Sleep interval between connections checks.\n\u001b[38;5;130m     19 \u001b[m    -x    Kills all connections immediately. Other options are ignored."\n\u001b[38;5;130m     20 \u001b[m  exit\n\u001b[38;5;130m     21 \u001b[m}\n\u001b[38;5;130m     22 \n     23 \u001b[mfunction get_number_db_connections() {\n\u001b[38;5;130m     24 \u001b[m    # count current\n\u001b[38;5;130m     25 \u001b[m    DB_CONNECTIONS_NUMBER=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select count(1) from stats_mysql_processlist where user = \'$DB_USER\' and db like \'db\\_%%\u001b[26;1H\u001b[38;5;130m        \u001b[m\' escape \'\\\'")\n\u001b[38;5;130m     26 \u001b[m}\n\u001b[38;5;130m     27 \n     28 \u001b[mfunction set_number_grace_seconds() {\n\u001b[38;5;130m     29 \u001b[m    local mysql_wait_timeout_ms=$(mysql -h127.0.0.1 -P6032 -uadmin -N --silent -e "select variable_value from global_variables where variable_name = \'mysql-wait_timm\u001b[31;1H\u001b[38;5;130m        \u001b[meout\'")\n\u001b[38;5;130m     30 \u001b[m    GRACE_PERIOD=$((($mysql_wait_timeout_ms+1000-1)/1000))\n\u001b[38;5;130m     31 \u001b[m}\n\u001b[38;5;130m     32 \n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '6',
      _source: {
        '@timestamp': '2022-07-14T11:16:34.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '6',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: '     33 \u001b[mfunction wait_for_connections() {\n\u001b[38;5;130m     34 \u001b[m    local number_of_loops=$(((($GRACE_PERIOD+$SLEEP_INTERVAL-1)/$SLEEP_INTERVAL)))\n\u001b[38;5;130m     35 \n     36 \u001b[m    echo "Waiting for connections to close for up to $GRACE_PERIOD seconds"\n\u001b[38;5;130m     37 \n     38 \u001b[m    for i in $(seq 0 $number_of_loops); do\n\u001b[38;5;130m     39 \u001b[m\u001b[8Cget_number_db_connections\n\u001b[38;5;130m     40 \u001b[m\u001b[8Cif [[ $DB_CONNECTIONS_NUMBER -eq 0 ]]; then\n\u001b[38;5;130m     41 \u001b[m\u001b[12Cecho "No connection found for user $DB_USER to this node"\n\u001b[38;5;130m     42 \u001b[m\u001b[12Cbreak\n\u001b[38;5;130m     43 \u001b[m\u001b[8Celse\n\u001b[38;5;130m     44 \u001b[m\u001b[12Cecho "$DB_CONNECTIONS_NUMBER connection(s) found, waiting for ${SLEEP_INTERVAL}s, round $i"\n\u001b[38;5;130m     45 \u001b[m\u001b[12Csleep $SLEEP_INTERVAL\n\u001b[38;5;130m     46 \u001b[m\u001b[8Cfi\n\u001b[38;5;130m     47 \u001b[m    done\n\u001b[38;5;130m     48 \u001b[m}\n\u001b[38;5;130m     49 \n     50 \u001b[mfunction parse_args() {\n\u001b[38;5;130m     51 \u001b[m    while getopts \'hs:w:x\' opt; do\n\u001b[38;5;130m     52 \u001b[m\u001b[8Ccase "$opt" in\n\u001b[38;5;130m     53 \u001b[m\u001b[8Ch)\n\u001b[38;5;130m     54 \u001b[m\u001b[12Cusage\n\u001b[38;5;130m     55 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     56 \u001b[m\u001b[8Cs)\u001b[1;9H\u001b[?25h\u001b[?25l\u001b[27m\u001b[29m\u001b[m\u001b[H\u001b[2J\u001b[1;1H\u001b[38;5;130m     58 \u001b[m\u001b[16C>&2 echo "Sleep interval (-s) must be a number"\n\u001b[38;5;130m     59 \u001b[m\u001b[16Cexit 1\n\u001b[38;5;130m     60 \u001b[m\u001b[12Cfi\n\u001b[38;5;130m     61 \u001b[m\u001b[12CARG_SLEEP_INTERVAL="$OPTARG"\n\u001b[38;5;130m     62 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     63 \u001b[m\u001b[8Cw)\n\u001b[38;5;130m     64 \u001b[m\u001b[12Cif ! [[ $OPTARG =~ ^[0-9]+$ ]]; then\n\u001b[38;5;130m     65 \u001b[m\u001b[16C>&2 echo "Wait timeout (-w) must be a number"\n\u001b[38;5;130m     66 \u001b[m\u001b[16Cexit 1\n\u001b[38;5;130m     67 \u001b[m\u001b[12Cfi\n\u001b[38;5;130m     68 \u001b[m\u001b[12CARG_GRACE_PERIOD="$OPTARG"\n\u001b[38;5;130m     69 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     70 \u001b[m\u001b[8Cx)\n\u001b[38;5;130m     71 \u001b[m\u001b[12CARG_KILL_IMMEDIATELY=1\n\u001b[38;5;130m     72 \u001b[m\u001b[12C;;\n\u001b[38;5;130m     73 \u001b[m\u001b[8Cesac\n\u001b[38;5;130m     74 \u001b[m    done\n\u001b[38;5;130m     75 \n     76 \u001b[m  GRACE_PERIOD=${ARG_GRACE_PERIOD:--1}\n\u001b[38;5;130m     77 \u001b[m  SLEEP_INTERVAL=${ARG_SLEEP_INTERVAL:-30}\n\u001b[38;5;130m     78 \u001b[m  KILL_IMMEDIATELY=${ARG_KILL_IMMEDIATELY:-0}\n\u001b[38;5;130m     79 \u001b[m}\n\u001b[38;5;130m     80 \n     81 \u001b[mDB_USER="rolap01"\n\u001b[38;5;130m     82 \n     83 \u001b[mparse_args $@\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '7',
      _source: {
        '@timestamp': '2022-07-14T11:16:35.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '7',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '2',
          name: 'vim',
          executable: '/bin/vi',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            max_bytes_per_process_exceeded: true,
            text: '\u001b[38;5;130m     84 \n     85 \u001b[mif [[ $KILL_IMMEDIATELY == 1 ]]; then\n\u001b[38;5;130m     86 \u001b[m    echo "WARNING: Not waiting for connections to close gracefully"\n\u001b[38;5;130m     87 \u001b[m    echo "Press any key to continue... wsrep_reject_queries will be set to \'ALL_KILL\'"\n\u001b[38;5;130m     88 \u001b[m    read a\n\u001b[38;5;130m     89 \u001b[m    mysql -h127.0.0.1 -P3306 -uroot -e "set global wsrep_reject_queries=\'ALL_KILL\'"\n\u001b[38;5;130m     90 \u001b[melse\n\u001b[38;5;130m     91 \u001b[m    # Stop accepting queries in mariadb, do not kill opened connections\n\u001b[38;5;130m     92 \u001b[m    mysql -h127.0.0.1 -P3306 -uroot -e "set global wsrep_reject_queries=\'ALL\'"\n\u001b[38;5;130m     93 \u001b[mfi\n\u001b[38;5;130m     94 \n     95 \u001b[mexit_code=$?\n\u001b[38;5;130m     96 \u001b[mif [[ $exit_code != 0 ]]; then\n\u001b[38;5;130m     97 \u001b[m    >&2 echo "Failed to set the reject of queries on Mysql node, exiting."\n\u001b[38;5;130m     98 \u001b[m    exit $exit_code\n\u001b[38;5;130m     99 \u001b[melse\n\u001b[38;5;130m    100 \u001b[m    echo "Successfully stopped accepting queries."\n\u001b[38;5;130m    101 \u001b[m    if [[ $KILL_IMMEDIATELY == 1 ]]; then\n\u001b[38;5;130m    102 \u001b[m\u001b[8Cexit\n\u001b[38;5;130m    103 \u001b[m    fi\n\u001b[38;5;130m    104 \u001b[mfi\n\u001b[38;5;130m    105 \n    106 \u001b[mif [[ $GRACE_PERIOD == -1 ]]; then\n\u001b[38;5;130m    107 \u001b[m    set_number_grace_seconds\n\u001b[38;5;130m    108 \u001b[mfi\n\u001b[38;5;130m    109 \n    110 \u001b[mwait_for_connections\n\u001b[38;5;130m    111 \u001b[mif [[ $DB_CONNECTIONS_NUMBER != 0 ]]; then\n\u001b[38;5;130m    112 \u001b[m    get_number_db_connections\n\u001b[38;5;130m    113 \u001b[m    >&2 echo "ERROR: There are still $DB_CONNECTIONS_NUMBER opened DB connections."\n\u001b[38;5;130m    114 \u001b[m    exit 3\n\u001b[38;5;130m    115 \u001b[mfi\b\b\u001b[?25h\u001b[?25l\nType  :qa!  and press <Enter> to abandon all changes and exit Vim\u0007\u001b[58;9H\u001b[?25h\u0007\u001b[?25l\u001b[59;1H\u001b[K\u001b[59;1H:\u001b[?2004h\u001b[?25hqa!\r\u001b[?25l\u001b[?2004l\u001b[59;1H\u001b[K\u001b[59;1H\u001b[?2004l\u001b[?1l\u001b>\u001b[?25h\u001b[?1049l\u001b[23;0;0t,\u001bkroot@staging-host:~\u001b\\\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '8',
      _source: {
        '@timestamp': '2022-07-14T11:16:36.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '8',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '3',
          name: 'wall',
          executable: '/bin/wall',
          entry_leader: {
            entity_id: '2', // a different session is actually running wall command, but it writes to session 1's tty.
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: 'An announcement to all TTYs! I am wall, hear me.. roar?',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },

    {
      _index: 'logs-endpoint.events.process',
      _id: '9',
      _source: {
        '@timestamp': '2022-07-14T11:16:36.570Z',
        message: 'hello world security',
        event: {
          action: 'text_output',
          id: '9',
        },
        host: {
          boot: {
            id: '1234',
          },
        },
        process: {
          entity_id: '1',
          name: 'bash',
          executable: '/bin/bash',
          entry_leader: {
            entity_id: '1',
          },
          io: {
            type: 'tty',
            total_bytes_captured: 1024,
            total_bytes_skipped: 0,
            bytes_skipped: [],
            text: '\u001bkroot@staging-host:~\u001b\\\b\b\b\b\u001b[1P\b\b\b\b\u001b[1P\b\b\b\b\u001b[1P\b\b\b\b\b\b\b\b\b\n\u001bkroot@staging-host:~\u001b\\\b\u001b[K\b\u001b[K\b\u001b[K\n,\n22/05/26 09:24:09 rack-na/cl_md (md), Cluster ********\n[root@staging-host:~] vi -R /usr/local/bin/script_one.sh\u0007\n22/05/26 09:25:32 rack-na/cl_md (md), Cluster ********\n[root@staging-host:~] vi -R /usr/local/bin/script_one.sh.sh.sh.sho.shp.sh\n22/05/26 09:30:08 rack-na/cl_md (md), Cluster ********\n[root@staging-host:~] exi\u0007\u0007\u0007exitlogout\n,\u001bec2-user@staging-host:~\u001b\\\n\u001bec2-user@staging-host:~\u001b\\\n,\n22/05/26 09:24:01 rack-na/cl_md (md), Cluster ********\n[ec2-user@staging-host:~] sudo -i\n22/05/26 10:11:37 rack-na/cl_md (md), Cluster ********\n[ec2-user@staging-host:~] exitlogout\n\n',
          },
          tty: {
            char_device: {
              major: 4,
              minor: 1,
            },
            rows: 59,
            columns: 173,
          },
        },
      },
    },
  ],
};
