## Compatability Testing

For each release, the Product team maintains a release of compatability between stack components.

From the perspective of Stack Monitoring, there are two vectors which must be monitored between monitored components and the
Stack Monitoring application:

1) _Beats version X -> Stack Monitoring Cluster Y_
2) _Logstash version X -> Stack Monitoring Cluster Y_

For each of the above, compatability must be verified.

## How to Test Compatability

For each release, the team will get tagged by the Product folks, generally via a comment on a spreadsheet. The spreadsheet will
contain rows which specify a range of versions of Stack Monitoring for which a given component must be tested. For example,
a cell in a row might indicate that tests need to be performed for Logstash 7.2.x against Stack Monitoring versions 7.0 - 7.3.

The following instructions will guide you through performing these tests. It is not necessary to follow the steps
as written. They are simply instructive. So long as functionality itself can be tested between the defined versions,
how you set up your environment to achieve that is up to you.

To begin, determine which versions need to be tested against. Typically, this is going to be a pair of Elasticsearch and Kibana
both of the same version and then a service, such as Logstash which is of another version. Download all needed versions
from elastic.co. As of this writing, artifacts are stored here: https://www.elastic.co/downloads/past-releases

Start up the Kibana and Elasticsearch pair using your downloaded archives. Navigate to the Kibana interface and then to the
Stack Monitoring application.

Enable monitoring and wait a few moments for monitoring data to start flowing in.

If it is not the first time testing a given service, it may already appear in the monitoring overview. If this is the case,
the corresponding index needs to be deleted.

Then, enable monitoring in the service that is being tested. Point it to the Elasticsearch cluster you just configured.

Verify that monitoring data flows in, that an index has been created and that graphs are populating themselves with data.

After this is done, tear down the cluster and stop the service, record the result, and move on to the next combination until
all have been verified.