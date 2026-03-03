# Kerberos Fixtures

Kerberos fixtures are created with the following principals:

* tester@TEST.ELASTIC.CO (password is `changeme`)
* host/kerberos.test.elastic.co@TEST.ELASTIC.CO
* HTTP/localhost@TEST.ELASTIC.CO

The SPNEGO token used in tests is generated for for `tester@TEST.ELASTIC.CO`. We can re-use it multiple times because we
disable replay cache (`-Dsun.security.krb5.rcache=none`) and set max possible `clockskew` in `krb5.conf`.