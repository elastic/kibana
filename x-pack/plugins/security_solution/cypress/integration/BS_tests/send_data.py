import json
import sys
from re import sub
from datetime import datetime
from elasticsearch import Elasticsearch, RequestsHttpConnection

spec_file_path = r'/Users/roeedar/repos/myScripts/spec.json'


def update_example_data_timestamp(json_file_path):

    # Read in the file
    with open(json_file_path, 'r') as file:
        file_data = file.read()

        # Replace the target string
        my_date = datetime.utcnow().isoformat()
        file_data = sub('"@timestamp": "[^"]+",', f'"@timestamp": "{my_date}Z",', file_data)

    # Write the file out again
    with open(json_file_path, 'w') as file:
        file.write(file_data)


def send_data_to_elastic(json_file_path, url):
    es = Elasticsearch(
        url,
        http_auth=("elastic", "changeme"),
        connection_class=RequestsHttpConnection
    )

    with open(json_file_path) as example_data:

        es.index(
            index='kuku',
            document=json.loads(example_data.read()),
            ignore=400
        )
    print("Done")


update_example_data_timestamp(spec_file_path)
send_data_to_elastic(spec_file_path, sys.argv[1])